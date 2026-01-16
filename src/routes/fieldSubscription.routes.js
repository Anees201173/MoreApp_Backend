const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { createSubscription, getFieldSubscriptions } = require('../controllers/fieldSubscription.controller');

// Create subscription for a field
router.post('/', auth, createSubscription);

// Get subscriptions for a field (filter by field_id, optional status)
router.get('/', auth, getFieldSubscriptions);

module.exports = router;
