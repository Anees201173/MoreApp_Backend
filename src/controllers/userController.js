const { models } = require('../config/db');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');

exports.list = asyncHandler(async (req, res) => {
  const users = await models.User.findAll({ limit: 100 });
  res.json({ data: users });
});

exports.get = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const user = await models.User.findByPk(id);
  if (!user) throw new ApiError(404, 'User not found');
  res.json({ data: user });
});

exports.update = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const user = await models.User.findByPk(id);
  if (!user) throw new ApiError(404, 'User not found');

  const allowed = ['name', 'role'];
  allowed.forEach((k) => { if (req.body[k] !== undefined) user[k] = req.body[k]; });
  await user.save();
  res.json({ data: user, message: 'User updated' });
});
