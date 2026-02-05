const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const authorize = require('../middleware/authorize');
const {
	createSubscription,
	getFieldSubscriptions,
	getMyFieldSubscriptions,
	cancelSubscription,
  getAdminSubscriptions,
} = require('../controllers/fieldSubscription.controller');

// Create subscription for a field
router.post('/', auth, createSubscription);

// Get subscriptions for the authenticated user
router.get('/me', auth, getMyFieldSubscriptions);

// Cancel subscription (owner-only)
router.patch('/:id/cancel', auth, cancelSubscription);

// Get subscriptions for a field (filter by field_id, optional status)
router.get('/', auth, getFieldSubscriptions);

// Get all field subscriptions for superadmin (global view)
router.get('/admin', auth, authorize('superadmin'), getAdminSubscriptions);

module.exports = router;
