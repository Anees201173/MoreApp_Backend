const express = require('express');
const router = express.Router();

const auth = require('../middleware/auth');
const authorize = require('../middleware/authorize');

const {
  getMyCart,
  addToCart,
  updateCartItem,
  removeCartItem,
  checkoutCart,
} = require('../controllers/cart.controller');

// Normal user cart
router.get('/', auth, authorize('user'), getMyCart);
router.post('/items', auth, authorize('user'), addToCart);
router.patch('/items/:id', auth, authorize('user'), updateCartItem);
router.delete('/items/:id', auth, authorize('user'), removeCartItem);
router.post('/checkout', auth, authorize('user'), checkoutCart);

module.exports = router;
