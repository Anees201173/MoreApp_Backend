const { Op } = require('sequelize');

const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const ApiResponse = require('../utils/ApiResponse');

const Notification = require('../models/Notification');
const { normalizeNotification } = require('../services/notification.service');

const toInt = (v, fallback) => {
  const n = Number.parseInt(v, 10);
  return Number.isFinite(n) && n > 0 ? n : fallback;
};

// @desc   Superadmin: list my notifications
// @route  GET /api/v1/notifications/admin?page=1&size=20&search=
// @access Private (superadmin)
exports.listAdminNotifications = asyncHandler(async (req, res) => {
  const page = toInt(req.query?.page, 1);
  const size = Math.min(toInt(req.query?.size, 20), 100);
  const search = (req.query?.search || '').trim();

  const offset = (page - 1) * size;

  const where = { recipient_user_id: req.user.id };
  if (search) {
    where[Op.or] = [
      { type: { [Op.iLike]: `%${search}%` } },
      { title: { [Op.iLike]: `%${search}%` } },
      { message: { [Op.iLike]: `%${search}%` } },
    ];
  }

  const result = await Notification.findAndCountAll({
    where,
    order: [['createdAt', 'DESC']],
    limit: size,
    offset,
  });

  res.status(200).json(
    new ApiResponse(
      200,
      {
        items: result.rows.map(normalizeNotification),
        pagination: {
          page,
          size,
          totalItems: result.count,
          totalPages: Math.ceil(result.count / size),
        },
      },
      'Notifications retrieved successfully'
    )
  );
});

// @desc   Superadmin: mark one notification as read
// @route  PATCH /api/v1/notifications/:id/read
// @access Private (superadmin)
exports.markNotificationRead = asyncHandler(async (req, res) => {
  const id = Number.parseInt(req.params?.id, 10);
  if (!Number.isFinite(id) || id <= 0) throw new ApiError(400, 'Invalid notification id');

  const n = await Notification.findOne({ where: { id, recipient_user_id: req.user.id } });
  if (!n) throw new ApiError(404, 'Notification not found');

  if (!n.is_read) {
    await n.update({ is_read: true });
  }

  res.status(200).json(new ApiResponse(200, { notification: normalizeNotification(n) }, 'Notification marked as read'));
});

// @desc   Superadmin: mark all my notifications as read
// @route  PATCH /api/v1/notifications/read-all
// @access Private (superadmin)
exports.markAllNotificationsRead = asyncHandler(async (req, res) => {
  const [updated] = await Notification.update(
    { is_read: true },
    {
      where: { recipient_user_id: req.user.id, is_read: false },
    }
  );

  res.status(200).json(new ApiResponse(200, { updated: updated || 0 }, 'Notifications marked as read'));
});
