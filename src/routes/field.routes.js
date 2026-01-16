const express = require('express');
const router = express.Router();
const { createField, getFields, getField, updateField, deleteField } = require('../controllers/field.controller');
const auth = require('../middleware/auth');
const { single } = require('../middleware/multer');

// List fields (authenticated)
router.get('/', auth, getFields);
router.get('/:id', auth, getField);

// Protected routes (merchant or admin)
// accept a single file named 'image' when creating/updating a field
router.post('/', auth, single('image'), createField);
router.put('/:id', auth, single('image'), updateField);
router.delete('/:id', auth, deleteField);

module.exports = router;
