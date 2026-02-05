const express = require('express');
const router = express.Router();

const auth = require('../middleware/auth');
const authorize = require('../middleware/authorize');
const { getMerchantDashboard, getMerchantWallet, getSuperadminDashboard, getMerchantDashboardForAdmin } = require('../controllers/dashboard.controller');

// Merchant dashboard (scoped to token)
router.get('/merchant', auth, authorize('merchant'), getMerchantDashboard);

// Merchant dashboard for superadmin by merchant id
router.get('/merchant/:merchantId', auth, authorize('superadmin'), getMerchantDashboardForAdmin);

// Superadmin global dashboard
router.get('/superadmin', auth, authorize('superadmin'), getSuperadminDashboard);

// Merchant wallet (derived from bookings revenue)
router.get('/merchant/wallet', auth, authorize('merchant'), getMerchantWallet);

module.exports = router;
