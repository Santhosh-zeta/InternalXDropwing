const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const { authenticate } = require('../middleware/auth.middleware');
const { withScope, getAccessibleDocument } = require('../utils/scope');
const { UPLOAD_ROOT } = require('../middleware/upload.middleware');

/**
 * Authenticated downloads for uploaded documents.
 *
 * `/uploads` used to be a bare express.static mount. Anyone who learned or
 * guessed a filename could read any file in it without a token — contracts,
 * invoices, whatever staff had uploaded — and the old filenames were
 * `Date.now() + counter`, which is guessable. This router replaces the static
 * mount for documents: the URL shape is unchanged (`/uploads/<stored name>`, as
 * the web client builds it) but every request now has to carry a session and
 * pass the same scope check (utils/scope.js documentWhere) that `GET /api/documents` applies.
 *
 * Avatars are NOT served here — see the express.static mount for
 * /uploads/avatars in server.js and the note there about why they stay public.
 */

/**
 * Documents whose type cannot execute in the browser are served inline, so
 * "open" in the client still previews a PDF or an image in a tab the way it
 * always has. Everything else is forced to download.
 *
 * Anything not on this list — including files uploaded before the type
 * allowlist existed, which could be literally anything — is sent as an
 * attachment with nosniff, so a stored .html or .svg cannot run as script on
 * this origin.
 */
const INLINE_SAFE_TYPES = new Set([
  'application/pdf',
  'image/png',
  'image/jpeg',
  'image/webp',
]);

router.get('/:filename', authenticate, withScope, async (req, res, next) => {
  try {
    const { filename } = req.params;

    /**
     * The lookup is by exact stored filename against the documents table, so
     * only a file we have a row for can be served at all. That is the real
     * traversal defence — "../../src/config/database.js" simply does not match
     * a row. The basename check below is belt and braces in case a future
     * caller reaches this handler another way.
     */
    if (filename !== path.basename(filename)) {
      return res.status(404).json({ success: false, message: 'File not found' });
    }

    // Same predicate as GET /api/documents (utils/scope.js). A document the
    // caller may not read is indistinguishable from one that does not exist.
    const doc = await getAccessibleDocument(req.scope, { path: filename });
    if (!doc) {
      return res.status(404).json({ success: false, message: 'File not found' });
    }

    const absolute = path.join(UPLOAD_ROOT, path.basename(doc.path));
    if (!fs.existsSync(absolute)) {
      return res.status(404).json({ success: false, message: 'File not found' });
    }

    const mime = doc.mime_type || 'application/octet-stream';
    const disposition = INLINE_SAFE_TYPES.has(mime) ? 'inline' : 'attachment';

    // nosniff stops the browser second-guessing the declared type, which is how
    // a "text/plain" upload ends up being rendered as HTML.
    res.setHeader('X-Content-Type-Options', 'nosniff');
    // A document is not a page: deny it every capability if it is ever rendered.
    res.setHeader('Content-Security-Policy', "default-src 'none'; sandbox");
    res.setHeader('Content-Type', mime);
    // Uploaded files are per-user authorised; a shared cache must not reuse the
    // response for the next person who asks for the same URL.
    res.setHeader('Cache-Control', 'private, no-store');

    return res.sendFile(absolute, {
      headers: {
        // Show the name the uploader chose, not the random stored one. The
        // filename is quoted and stripped of quotes/control characters so it
        // cannot inject extra header parameters.
        'Content-Disposition': `${disposition}; filename="${String(doc.original_name || doc.file_name).replace(/[^\w.\- ]/g, '_')}"`,
      },
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
