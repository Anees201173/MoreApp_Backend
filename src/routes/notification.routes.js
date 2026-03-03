const express = require('express');
const router = express.Router();

const auth = require('../middleware/auth');
const authorize = require('../middleware/authorize');

const {
  listAdminNotifications,
  markNotificationRead,
  markAllNotificationsRead,
} = require('../controllers/notification.controller');

router.get('/admin', auth, authorize('superadmin'), listAdminNotifications);
router.patch('/read-all', auth, authorize('superadmin'), markAllNotificationsRead);
router.patch('/:id/read', auth, authorize('superadmin'), markNotificationRead);

module.exports = router;
