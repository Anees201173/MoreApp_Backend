const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { createBooking, getFieldBookings } = require('../controllers/fieldBooking.controller');

// Create booking for a field
router.post('/', auth, createBooking);

// Get bookings for a field (filter by field_id, optional status)
router.get('/', auth, getFieldBookings);

module.exports = router;
