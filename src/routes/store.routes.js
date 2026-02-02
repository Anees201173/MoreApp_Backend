const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const authorize = require('../middleware/authorize');
const { single } = require('../middleware/multer');

const {
  createStore,
  getStores,
  getMyStores,
  getStore,
  updateStore,
  deleteStore,
} = require('../controllers/store.controller');

// Only superadmin and merchant can create/update/delete stores
router.post('/', auth, authorize('superadmin', 'merchant'), single('image'), createStore);
router.get('/', auth, getStores);
router.get('/my', auth, authorize('merchant'), getMyStores);
router.get('/:id', auth, getStore);
router.put('/:id', auth, authorize('superadmin', 'merchant'), single('image'), updateStore);
router.delete('/:id', auth, authorize('superadmin', 'merchant'), deleteStore);

module.exports = router;
