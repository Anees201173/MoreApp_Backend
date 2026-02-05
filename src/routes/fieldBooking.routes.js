const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const authorize = require('../middleware/authorize');
const { createBooking, getFieldBookings, getCompanyBookings, getAdminBookings, updateBookingStatus } = require('../controllers/fieldBooking.controller');

// Create booking for a field
router.post('/', auth, createBooking);

// Get bookings for a field (filter by field_id, optional status)
router.get('/', auth, getFieldBookings);

// Get bookings for a company (companyadmin / employee / superadmin)
router.get(
	'/company',
	auth,
	authorize('superadmin', 'companyadmin', 'user'),
	getCompanyBookings
);

// Get all bookings for superadmin (global view)
router.get(
	'/admin',
	auth,
	authorize('superadmin'),
	getAdminBookings
);

// Update booking status (merchant/superadmin)
router.patch('/:id/status', auth, updateBookingStatus);

module.exports = router;
