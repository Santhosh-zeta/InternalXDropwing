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
  DOCUMENT_TYPES,
  AVATAR_TYPES,
  UPLOAD_ROOT,
  AVATAR_DIR,
};
