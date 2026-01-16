const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { single } = require('../middleware/multer');
const {
  createAddon,
  getAddons,
  getAddon,
  updateAddon,
  deleteAddon,
} = require('../controllers/addon.controller');

router.get('/', auth, getAddons);
router.get('/:id', auth, getAddon);
router.post('/', auth, single('image'), createAddon);
router.put('/:id', auth, single('image'), updateAddon);
router.delete('/:id', auth, deleteAddon);

module.exports = router;
