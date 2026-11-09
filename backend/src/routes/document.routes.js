const express = require('express');
const router = express.Router();
const documentController = require('../controllers/document.controller');
const { authenticate } = require('../middleware/auth.middleware');
const { withScope } = require('../utils/scope');
const { documentUpload, handleUploadErrors } = require('../middleware/upload.middleware');
const { uploadLimiter } = require('../middleware/rateLimit.middleware');
const { uploadDocumentRules, documentIdRules } = require('../middleware/validate.middleware');

router.use(authenticate, withScope);

/**
 * handleUploadErrors sits between multer and the controller so a rejected file
 * type comes back as a 400 with the reason, rather than falling through to the
 * generic error handler as a 500.
 */
router.post(
  '/upload',
  uploadLimiter,
  documentUpload.single('file'),
  handleUploadErrors,
  uploadDocumentRules,
  documentController.uploadDocument
);
router.get('/', documentController.getDocuments);
router.delete('/:id', documentIdRules, documentController.deleteDocument);
router.patch('/:id/client-visible', documentIdRules, documentController.setClientVisible);

module.exports = router;
