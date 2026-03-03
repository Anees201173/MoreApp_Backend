const express = require('express');
const router = express.Router();

const auth = require('../middleware/auth');
const authorize = require('../middleware/authorize');

const {
  createSubscription,
  getAllSubscriptions,
  getMySubscriptions,
  getSubscriptionsForUser,
  getMyIssuedSubscriptions,
  cancelSubscription,
  cancelMySubscription,
  redeemSubscription,
} = require('../controllers/merchantSubscription.controller');

const {
  createPlan,
  getMyPlans,
  togglePlanStatus,
  subscribeToPlan,
  listPlans,
  getPlanById,
} = require('../controllers/merchantSubscriptionPlan.controller');

// Merchant adds a subscription for a user
router.post('/', auth, authorize('merchant'), createSubscription);

// List subscriptions (scoped by role in controller)
router.get('/', auth, getAllSubscriptions);

// Viewer endpoints
router.get('/me', auth, getMySubscriptions);
router.get('/user/:userId', auth, getSubscriptionsForUser);

// Merchant endpoints
router.get('/merchant/me', auth, authorize('merchant'), getMyIssuedSubscriptions);
router.patch('/:id/cancel', auth, authorize('merchant'), cancelSubscription);
router.post('/:id/redeem', auth, authorize('merchant'), redeemSubscription);

// User endpoints
router.patch('/:id/cancel-me', auth, cancelMySubscription);

// =======================================================
//   MERCHANT SUBSCRIPTION PLANS (under /subscriptions)
// =======================================================

// Browse plans (active plans posted by merchants)
router.get('/plans', auth, listPlans);

// Get plan details
router.get('/plans/:id', auth, getPlanById);

// Merchant creates subscription plans
router.post('/plans', auth, authorize('merchant'), createPlan);

// Merchant lists their plans (with counts)
router.get('/plans/merchant/me', auth, authorize('merchant'), getMyPlans);

// Merchant toggles plan active status
router.patch('/plans/:id/toggle-status', auth, authorize('merchant'), togglePlanStatus);

// User subscribes to a plan
router.post('/plans/:id/subscribe', auth, subscribeToPlan);

module.exports = router;
