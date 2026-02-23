const express = require('express');
const router = express.Router();

const auth = require('../middleware/auth');
const authorize = require('../middleware/authorize');

const {
  createPlan,
  getMyPlans,
  togglePlanStatus,
  subscribeToPlan,
  listPlans,
  getPlanById,
} = require('../controllers/merchantSubscriptionPlan.controller');

// Browse plans (active plans posted by merchants)
router.get('/', auth, listPlans);

// Merchant creates subscription plans
router.post('/', auth, authorize('merchant'), createPlan);

// Merchant lists their plans
router.get('/merchant/me', auth, authorize('merchant'), getMyPlans);

// Get plan details
router.get('/:id', auth, getPlanById);

// User subscribes to a plan
router.post('/:id/subscribe', auth, subscribeToPlan);

// Merchant toggles plan active status
router.patch('/:id/toggle-status', auth, authorize('merchant'), togglePlanStatus);

module.exports = router;
