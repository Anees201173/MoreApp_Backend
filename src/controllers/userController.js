const { User } = require('../models');
const { Op } = require('sequelize');
const { validationResult } = require('express-validator');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const ApiResponse = require('../utils/ApiResponse');
const { getPagination, getPagingData } = require('../utils/pagination');
const { sanitizeObject } = require('../utils/helpers')

// @desc    Get all users
// @route   GET /api/users
// @access  Private (Admin)
const getAllUsers = asyncHandler(async (req, res) => {
  const { page, size, search, role, is_active } = req.query;
  const { limit, offset } = getPagination(page, size);

  // Build where clause
  const whereClause = {};

  if (search) {
    whereClause[Op.or] = [
      { name: { [Op.like]: `%${search}%` } },
      { username: { [Op.like]: `%${search}%` } },
      { email: { [Op.like]: `%${search}%` } }
    ];
  }

  if (role) {
    whereClause.role = role;
  }

  if (is_active !== undefined) {
    whereClause.is_active = is_active === 'true';
  }

  const data = await User.findAndCountAll({
    where: whereClause,
    limit,
    offset,
    order: [['created_at', 'DESC']],
    attributes: { exclude: ['password'] }
  });

  const result = getPagingData(data, page, limit);

  res.status(200).json(
    new ApiResponse(200, result, 'Users retrieved successfully')
  );
});

// @desc    Get user by ID
// @route   GET /api/users/:id
// @access  Private
const getUserById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const user = await User.findByPk(id, {
    attributes: { exclude: ['password'] }
  });

  if (!user) {
    throw new ApiError(404, 'User not found');
  }

  res.status(200).json(
    new ApiResponse(200, { user }, 'User retrieved successfully')
  );
});

// @desc    Create new user
// @route   POST /api/users
// @access  Private (Admin)
const createUser = asyncHandler(async (req, res) => {
  // Check for validation errors
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new ApiError(400, 'Validation failed', errors.array());
  }

  const { name, username, email, password, phone, role } = req.body;

  // Check if user already exists
  const existingUser = await User.findByEmail(email);
  if (existingUser) {
    throw new ApiError(400, 'User already exists with this email');
  }

  // Create user
  const user = await User.create({
    name,
    username,
    email,
    password,
    phone,
    role: role || 'member'
  });

  res.status(201).json(
    new ApiResponse(201, { user }, 'User created successfully')
  );
});

// @desc    Update user
// @route   PUT /api/v1/users/:id
// @access  Private (Admin or own profile)
const updateUser = asyncHandler(async (req, res) => {
  // Check for validation errors
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new ApiError(400, 'Validation failed', errors.array());
  }

  const { id } = req.params;
  const { name, username, phone, role } = req.body;

  const user = await User.findByPk(id);
  if (!user) {
    throw new ApiError(404, 'User not found');
  }

  // Check if user can update this profile
  if (req.user.role !== 'superadmin' && req.user.id !== parseInt(id)) {
    throw new ApiError(403, 'Not authorized to update this user');
  }

  // Update only allowed fields (no role or is_active here)
  const updateData = {
    name: name || user.name,
    username: username || user.username,
    phone: phone || user.phone,
    role : role || user.role
  };

  await user.update(updateData);

  res.status(200).json(
    new ApiResponse(200, { user }, 'User updated successfully')
  );
});


// @desc    Delete user
// @route   DELETE /api/users/:id
// @access  Private (Admin)
const deleteUser = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const user = await User.findByPk(id);
  if (!user) {
    throw new ApiError(404, 'User not found');
  }

  // Prevent admin from deleting themselves
  if (req.user.id === parseInt(id)) {
    throw new ApiError(400, 'Cannot delete your own account');
  }

  await user.destroy();

  res.status(200).json(
    new ApiResponse(200, null, 'User deleted successfully')
  );
});

// @desc    Toggle user active status
// @route   PATCH /api/users/:id/toggle-status
// @access  Private (Admin)
const toggleUserStatus = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const user = await User.findByPk(id);
  if (!user) {
    throw new ApiError(404, 'User not found');
  }

  // Prevent admin from deactivating themselves
  if (req.user.id === parseInt(id)) {
    throw new ApiError(400, 'Cannot deactivate your own account');
  }

  await user.update({ is_active: !user.is_active });

  // Sanitize user object before sending
  const sanitizedUser = sanitizeObject(user.toJSON(), [
    'password',
    'otp',
    'otpExpires',
    'role',
    'email_verified',
    'otpType',
    'refreshToken' // optional, if you store it in DB
  ]);

  res.status(200).json(
    new ApiResponse(
      200,
      {sanitizedUser },
      `User status set to ${user.is_active ? true : false} successfully`
    )
  );
});


// @desc    Search users by email, name, or ID
// @route   GET /api/users/search
// @access  Private (Admin)
const searchUsers = asyncHandler(async (req, res) => {
  const {
    query,     // Search query for email, name, or ID
    role,      // Filter by role
    isActive,  // Filter by active status
    page = 1,
    limit = 10
  } = req.query;

  let whereClause = {};

  if (query) {
    // Try to parse as ID first
    const id = !isNaN(query) ? parseInt(query) : null;

    whereClause[Op.or] = [
      { name: { [Op.like]: `%${query}%` } },
      { username: { [Op.like]: `%${query}%` } },
      { email: { [Op.like]: `%${query}%` } }
    ];

    // Add ID search if query is a number
    if (id) {
      whereClause[Op.or].push({ id: id });
    }
  }

  if (role) {
    whereClause.role = role;
  }

  if (isActive !== undefined) {
    whereClause.is_active = isActive === 'true';
  }

  const offset = (page - 1) * limit;

  const { count, rows } = await User.findAndCountAll({
    where: whereClause,
    limit: parseInt(limit),
    offset: parseInt(offset),
    order: [['created_at', 'DESC']],
    attributes: { exclude: ['password'] }
  });

  const totalPages = Math.ceil(count / limit);

  res.status(200).json(
    new ApiResponse(200, {
      users: rows,
      meta: {
        total: count,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages
      }
    }, 'Users retrieved successfully')
  );
});

// @desc    Search customers (member access only)
// @route   GET /api/users/search-customers
// @access  Private (Member)
// const searchCustomers = asyncHandler(async (req, res) => {
//   const { 
//     query,     // Search query for email, name, or ID
//     isActive,  // Filter by active status
//     page = 1,
//     limit = 10
//   } = req.query;

//   let whereClause = {
//     role: 'customer' // Only search customers
//   };

//   if (query) {
//     // Try to parse as ID first
//     const id = !isNaN(query) ? parseInt(query) : null;

//     whereClause[Op.or] = [
//       { first_name: { [Op.like]: `%${query}%` } },
//       { last_name: { [Op.like]: `%${query}%` } },
//       { email: { [Op.like]: `%${query}%` } }
//     ];

//     // Add ID search if query is a number
//     if (id) {
//       whereClause[Op.or].push({ id: id });
//     }
//   }

//   if (isActive !== undefined) {
//     whereClause.is_active = isActive === 'true';
//   }

//   const offset = (page - 1) * limit;

//   const { count, rows } = await User.findAndCountAll({
//     where: whereClause,
//     limit: parseInt(limit),
//     offset: parseInt(offset),
//     order: [['created_at', 'DESC']],
//     attributes: { exclude: ['password'] }
//   });

//   const totalPages = Math.ceil(count / limit);

//   res.status(200).json(
//     new ApiResponse(200, {
//       customers: rows,
//       meta: {
//         total: count,
//         page: parseInt(page),
//         limit: parseInt(limit),
//         totalPages
//       }
//     }, 'Customers retrieved successfully')
//   );
// });

module.exports = {
  getAllUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
  toggleUserStatus,
  searchUsers,
  // searchCustomers

};