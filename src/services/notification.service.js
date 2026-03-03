const Notification = require('../models/Notification');
const User = require('../models/User');
const { getIO } = require('../realtime/socket');

const normalizeNotification = (n) => {
  if (!n) return null;
  return {
    id: n.id,
    recipient_user_id: n.recipient_user_id,
    type: n.type,
    title: n.title,
    message: n.message,
    data: n.data,
    is_read: !!n.is_read,
    createdAt: n.createdAt,
    updatedAt: n.updatedAt,
  };
};

const notifySuperadmins = async ({ type, title, message, data }) => {
  const superadmins = await User.findAll({
    where: { role: 'superadmin', is_active: true },
    attributes: ['id'],
  });

  if (!superadmins.length) return [];

  const rows = superadmins.map((u) => ({
    recipient_user_id: u.id,
    type: String(type || 'system'),
    title: title ? String(title) : null,
    message: String(message || ''),
    data: data ?? null,
    is_read: false,
  }));

  const created = await Notification.bulkCreate(rows, { returning: true });

  const io = getIO();
  if (io) {
    io.to('role:superadmin').emit('admin:notification', created.map(normalizeNotification));
  }

  return created;
};

module.exports = {
  notifySuperadmins,
  normalizeNotification,
};
