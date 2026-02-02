const express = require('express');
const router = express.Router();
const { createField, getFields, getFieldsByCategory, getField, updateField, deleteField } = require('../controllers/field.controller');
const { getFieldAvailability, setFieldAvailability } = require('../controllers/fieldAvailability.controller');
const auth = require('../middleware/auth');
const { single } = require('../middleware/multer');

// List fields (authenticated)
router.get('/', auth, getFields);
router.get('/filter', auth, getFields);
router.get('/category/:field_category_id', auth, getFieldsByCategory);
router.get('/:id/availability', auth, getFieldAvailability);
router.put('/:id/availability', auth, setFieldAvailability);
router.get('/:id', auth, getField);

// Protected routes (merchant or admin)
// accept a single file named 'image' when creating/updating a field
router.post('/', auth, single('image'), createField);
router.put('/:id', auth, single('image'), updateField);
router.delete('/:id', auth, deleteField);

module.exports = router;
