const express = require('express');

const auth = require('../middleware/auth');
const {
  getMyWishlistProducts,
  addProductToWishlist,
  removeProductFromWishlist,
  getWishlistStatus,
} = require('../controllers/wishlist.controller');

const router = express.Router();

router.get('/products', auth, getMyWishlistProducts);
router.get('/products/:productId/status', auth, getWishlistStatus);
router.post('/products/:productId', auth, addProductToWishlist);
router.delete('/products/:productId', auth, removeProductFromWishlist);

module.exports = router;
