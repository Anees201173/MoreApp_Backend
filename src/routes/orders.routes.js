const express = require('express');
const router = express.Router();

const auth = require('../middleware/auth');
const authorize = require('../middleware/authorize');

const {
  getAllOrdersForAdmin,
  getMyOrders,
  getMyOrderById,
  getMerchantOrders,
  updateOrderStatus,
} = require('../controllers/order.controller');

// Superadmin
router.get('/admin', auth, authorize('superadmin'), getAllOrdersForAdmin);

// User
router.get('/me', auth, authorize('user'), getMyOrders);
router.get('/:id', auth, authorize('user'), getMyOrderById);

// Merchant
router.get('/merchant/me', auth, authorize('merchant'), getMerchantOrders);
router.patch('/:id/status', auth, authorize('merchant'), updateOrderStatus);

module.exports = router;
