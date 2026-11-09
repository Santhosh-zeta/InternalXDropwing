const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

/**
 * Upload hardening.
 *
 * A size limit on its own stops nothing but disk exhaustion. Before this,
 * `POST /api/documents/upload` and `POST /api/team-members/me/avatar` would
 * accept any bytes under any name, write them into a directory the server also
 * serves over HTTP, and keep the attacker-supplied extension. That is the
 * classic path to a stored XSS (upload .html/.svg, send someone the link) or
 * worse if anything downstream ever executes what is in that directory.
 *
 * Three separate controls here:
 *   1. an allowlist checked against BOTH the declared MIME type and the file
 *      extension, which must agree with each other;
 *   2. a generated filename, so nothing the client sends reaches the
 *      filesystem;
 *   3. a rejection that reads as a 400 rather than a 500.
 */

/**
 * extension -> the MIME types a browser or client legitimately sends for it.
 * Clients disagree (Excel alone shows up as three different types), so each
 * extension carries a set rather than a single value — but a .pdf claiming to
 * be image/png is still refused.
 */
const DOCUMENT_TYPES = {
  '.pdf': ['application/pdf'],
  '.doc': ['application/msword'],
  '.docx': ['application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
  '.xls': ['application/vnd.ms-excel', 'application/excel', 'application/x-excel'],
  '.xlsx': ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'],
  '.ppt': ['application/vnd.ms-powerpoint'],
  '.pptx': ['application/vnd.openxmlformats-officedocument.presentationml.presentation'],
  '.txt': ['text/plain'],
  '.csv': ['text/csv', 'application/csv', 'text/plain', 'application/vnd.ms-excel'],
  '.png': ['image/png'],
  '.jpg': ['image/jpeg'],
  '.jpeg': ['image/jpeg'],
};

/**
 * Avatars are rendered straight into an <img> on every page of the app, so the
 * list is narrower: three raster formats and nothing that can carry script.
 * SVG is deliberately absent — it is an XML document that can execute.
 */
const AVATAR_TYPES = {
  '.png': ['image/png'],
  '.jpg': ['image/jpeg'],
  '.jpeg': ['image/jpeg'],
  '.webp': ['image/webp'],
};

class UploadTypeError extends Error {
  constructor(message) {
    super(message);
    this.name = 'UploadTypeError';
    this.code = 'UNSUPPORTED_FILE_TYPE';
  }
}

const describeAllowed = (allowlist) =>
  Object.keys(allowlist).map(e => e.replace('.', '')).join(', ');

const makeFileFilter = (allowlist) => (req, file, cb) => {
  const ext = path.extname(file.originalname || '').toLowerCase();
  const declared = String(file.mimetype || '').split(';')[0].trim().toLowerCase();

  const accepted = allowlist[ext];
  if (!accepted) {
    return cb(new UploadTypeError(
      `File type "${ext || 'unknown'}" is not allowed. Allowed types: ${describeAllowed(allowlist)}.`
    ));
  }

  // Both halves must agree. Checking only the extension lets "report.pdf" carry
  // an HTML payload that a browser will happily sniff; checking only the MIME
  // type lets a client label a .sh as application/pdf and keep the .sh on disk.
  if (!accepted.includes(declared)) {
    return cb(new UploadTypeError(
      `Declared content type "${file.mimetype}" does not match the "${ext}" extension.`
    ));
  }

  return cb(null, true);
};

/**
 * The stored name is generated, never derived from user input:
 *   - 16 random bytes of hex, so it cannot collide, cannot be guessed, and
 *     cannot contain "..", "/", a NUL byte or a leading dash;
 *   - the extension comes from the allowlist key we just matched, not from the
 *     request, so a double extension like "invoice.pdf.php" cannot survive.
 */
const makeFilename = (prefix, allowlist) => (req, file, cb) => {
  const ext = path.extname(file.originalname || '').toLowerCase();
  if (!allowlist[ext]) {
    return cb(new UploadTypeError(`File type "${ext || 'unknown'}" is not allowed.`));
  }
  cb(null, `${prefix}${crypto.randomBytes(16).toString('hex')}${ext}`);
};

const makeStorage = (dir, prefix, allowlist) => multer.diskStorage({
  destination: function (req, file, cb) {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    cb(null, dir);
  },
  filename: makeFilename(prefix, allowlist),
});

const UPLOAD_ROOT = path.join(__dirname, '../../uploads');
const AVATAR_DIR = path.join(UPLOAD_ROOT, 'avatars');

const documentUpload = multer({
  storage: makeStorage(UPLOAD_ROOT, '', DOCUMENT_TYPES),
  fileFilter: makeFileFilter(DOCUMENT_TYPES),
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit
    files: 1,
  },
});

const avatarUpload = multer({
  storage: makeStorage(AVATAR_DIR, 'avatar-', AVATAR_TYPES),
  fileFilter: makeFileFilter(AVATAR_TYPES),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
    files: 1,
  },
});

/**
 * Magic-byte check. Extension and declared MIME type are both client-controlled,
 * so after multer has stored the file we read its first bytes and require them to
 * match the format the extension claims. An .exe, an HTML page or an SVG renamed to
 * .pdf/.png/.txt is deleted and refused. (HTML, SVG, scripts and executables are
 * also absent from the allowlists above, so there is no extension that accepts them.)
 */
const startsWith = (buf, bytes, offset = 0) => bytes.every((b, i) => buf[offset + i] === b);
const ZIP = [0x50, 0x4b, 0x03, 0x04];
const OLE = [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1];
const SIGNATURES = {
  '.pdf': (b) => startsWith(b, [0x25, 0x50, 0x44, 0x46, 0x2d]),
  '.png': (b) => startsWith(b, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  '.jpg': (b) => startsWith(b, [0xff, 0xd8, 0xff]),
  '.jpeg': (b) => startsWith(b, [0xff, 0xd8, 0xff]),
  '.webp': (b) => startsWith(b, [0x52, 0x49, 0x46, 0x46]) && startsWith(b, [0x57, 0x45, 0x42, 0x50], 8),
  '.docx': (b) => startsWith(b, ZIP),
  '.xlsx': (b) => startsWith(b, ZIP),
  '.pptx': (b) => startsWith(b, ZIP),
  '.doc': (b) => startsWith(b, OLE),
  '.xls': (b) => startsWith(b, OLE),
  '.ppt': (b) => startsWith(b, OLE),
};
const EXECUTABLE_MAGIC = [[0x4d, 0x5a], [0x7f, 0x45, 0x4c, 0x46], [0xcf, 0xfa, 0xed, 0xfe], [0xca, 0xfe, 0xba, 0xbe], [0x23, 0x21]];
const MARKUP = /^\s*<\s*(!doctype|html|head|body|script|svg|\?xml|iframe|object|embed|meta|link|style)/i;

/** Plain-text formats: no binary bytes, no executable header, no markup that a browser would run. */
const looksLikePlainText = (b) => {
  if (b.includes(0)) return false;
  if (EXECUTABLE_MAGIC.some((sig) => startsWith(b, sig))) return false;
  return !MARKUP.test(b.toString('utf8').replace(/^\uFEFF/, ''));
};

const contentMatchesExtension = (ext, head) => {
  if (EXECUTABLE_MAGIC.some((sig) => startsWith(head, sig))) return false;
  if (ext === '.txt' || ext === '.csv') return looksLikePlainText(head);
  const check = SIGNATURES[ext];
  return Boolean(check && head.length > 0 && check(head));
};

/** Mount right after the multer middleware (and before handleUploadErrors is fine too). */
const verifyUploadContent = (req, res, next) => {
  const file = req.file;
  if (!file) return next();
  let head = Buffer.alloc(0);
  try {
    const fd = fs.openSync(file.path, 'r');
    try {
      head = Buffer.alloc(4096);
      const n = fs.readSync(fd, head, 0, 4096, 0);
      head = head.subarray(0, n);
    } finally {
      fs.closeSync(fd);
    }
  } catch (err) {
    return next(err);
  }
  if (contentMatchesExtension(path.extname(file.filename).toLowerCase(), head)) return next();
  fs.unlink(file.path, () => {});
  return res.status(400).json({ success: false, message: 'File content does not match its type, or the type is not allowed.' });
};

/**
 * Turns multer's own errors into the JSON envelope the rest of the API uses.
 * Without this a rejected upload falls through to the generic error handler and
 * surfaces as a 500, which tells the user nothing and looks like a server bug.
 *
 * Mount immediately after the multer middleware on each upload route.
 */
const handleUploadErrors = (err, req, res, next) => {
  if (err instanceof UploadTypeError) {
    return res.status(400).json({ success: false, message: err.message });
  }

  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({ success: false, message: 'File is too large.' });
    }
    if (err.code === 'LIMIT_FILE_COUNT' || err.code === 'LIMIT_UNEXPECTED_FILE') {
      return res.status(400).json({ success: false, message: 'Only one file may be uploaded at a time.' });
    }
    return res.status(400).json({ success: false, message: `Upload rejected: ${err.message}` });
  }

  return next(err);
};

module.exports = {
  documentUpload,
  avatarUpload,
  handleUploadErrors,
  verifyUploadContent,
  contentMatchesExtension,
  DOCUMENT_TYPES,
  AVATAR_TYPES,
  UPLOAD_ROOT,
  AVATAR_DIR,
};
