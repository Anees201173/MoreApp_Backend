const express = require('express');
const router = express.Router();

const auth = require('../middleware/auth');
const authorize = require('../middleware/authorize');
const { getMerchantDashboard, getMerchantWallet, getSuperadminDashboard, getMerchantDashboardForAdmin } = require('../controllers/dashboard.controller');
const { getCompanyWallet, depositCompanyWallet } = require('../controllers/companyWallet.controller');
const { getEnergyConversion, updateEnergyConversion } = require('../controllers/energyConversion.controller');
const { getSuperadminWalletOverview } = require('../controllers/superadminWallet.controller');

// Merchant dashboard (scoped to token)
router.get('/merchant', auth, authorize('merchant'), getMerchantDashboard);

// Merchant dashboard for superadmin by merchant id
router.get('/merchant/:merchantId', auth, authorize('superadmin'), getMerchantDashboardForAdmin);

// Superadmin global dashboard
router.get('/superadmin', auth, authorize('superadmin'), getSuperadminDashboard);

// Superadmin energy conversion setting (SAR -> energy points)
router.get('/superadmin/energy-conversion', auth, authorize('superadmin'), getEnergyConversion);
router.put('/superadmin/energy-conversion', auth, authorize('superadmin'), updateEnergyConversion);

// Company can read the current energy conversion (read-only)
router.get('/company/energy-conversion', auth, authorize('companyadmin', 'superadmin'), getEnergyConversion);

// Superadmin wallet overview (company balances + recent deposits)
router.get('/superadmin/wallet-overview', auth, authorize('superadmin'), getSuperadminWalletOverview);

// Merchant wallet (derived from bookings revenue)
router.get('/merchant/wallet', auth, authorize('merchant'), getMerchantWallet);

// Company wallet (stored balance + transactions)
router.get('/company/wallet', auth, authorize('companyadmin'), getCompanyWallet);
router.post('/company/wallet/deposit', auth, authorize('companyadmin'), depositCompanyWallet);

module.exports = router;
