const express = require('express');
const router = express.Router();

const auth = require('../middleware/auth');
const authorize = require('../middleware/authorize');
const { single, array } = require('../middleware/multer');
const { uploadSingle, uploadMultiple } = require('../controllers/upload.controller');

// Generic media upload routes (image or video)
// Use form-data:
//  - single file: field name "file"
//  - multiple files: field name "files"

// Single upload
router.post(
  '/single',
  auth,
  authorize('superadmin', 'companyadmin', 'merchant'),
  single('file'),
  uploadSingle
);

// Multiple upload
router.post(
  '/multiple',
  auth,
  authorize('superadmin', 'companyadmin', 'merchant'),
  array('files', 10),
  uploadMultiple
);

module.exports = router;
