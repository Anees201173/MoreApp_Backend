const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const authorize = require('../middleware/authorize');

const {
  upsertPlan,
  listPlans,
  getPlanById,
  updatePlan,
  togglePlanStatus,
} = require('../controllers/subscriptionPlan.controller');

// Public/user list (auth optional in current backend, but we keep it auth-protected to match existing style)
router.get('/', auth, listPlans);
router.get('/:id', auth, getPlanById);

// Merchant create/update (upsert by field_id+type)
router.post('/', auth, authorize('merchant', 'superadmin'), upsertPlan);

// Merchant updates
router.put('/:id', auth, authorize('merchant', 'superadmin'), updatePlan);
router.patch('/:id/toggle-status', auth, authorize('merchant', 'superadmin'), togglePlanStatus);

module.exports = router;
