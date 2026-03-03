const { User, Company, Merchant, Post, PostRepost, EmployeeDeleteVerification, sequelize } = require('../models');
const { Op } = require('sequelize');
const { validationResult } = require('express-validator');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const ApiResponse = require('../utils/ApiResponse');
const { getPagination, getPagingData } = require('../utils/pagination');
const { sanitizeObject } = require('../utils/helpers')
const crypto = require('crypto');
const { sendEmail } = require('../utils/email');

const EnergyConversionSetting = require('../models/EnergyConversionSetting');
const CompanyWalletTransaction = require('../models/CompanyWalletTransaction');

const sha256Hex = (value) =>
  crypto.createHash('sha256').update(String(value)).digest('hex');

const hmacSha256Hex = (value) => {
  const secret =
    process.env.EMPLOYEE_DELETE_OTP_SECRET ||
    process.env.JWT_SECRET ||
    'employee-delete-otp';
  return crypto
    .createHmac('sha256', secret)
    .update(String(value))
    .digest('hex');
};

const generate6DigitCode = () => {
  const n = crypto.randomInt(0, 1_000_000);
  return String(n).padStart(6, '0');
};

const requireCompanyForAdmin = async (adminUserId) => {
  const company = await Company.findOne({ where: { admin_id: adminUserId } });
  if (!company) {
    throw new ApiError(404, 'Company not found for this admin');
  }
  return company;
};

const findCompanyEmployeeOrThrow = async ({ companyId, employeeId }) => {
  const employee = await User.findByPk(employeeId);
  if (!employee) {
    throw new ApiError(404, 'Employee not found');
  }

  if (employee.role !== 'user') {
    throw new ApiError(403, 'You can only delete employees');
  }

  if (!employee.company_id || Number(employee.company_id) !== Number(companyId)) {
    throw new ApiError(403, 'You can only delete employees in your company');
  }

  const points = Number.parseFloat(employee.energy_points_balance ?? 0);
  if (Number.isFinite(points) && points > 0) {
    throw new ApiError(400, 'Cannot delete employee with energy points');
  }

  return employee;
};

// @desc    Update my profile (based on token)
// @route   PUT /api/v1/user/me
// @access  Private
const updateMyProfile = asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new ApiError(400, 'Validation failed', errors.array());
  }

  const { name, username, phone, gender, country, city } = req.body;

  const user = await User.findByPk(req.user.id);
  if (!user) {
    throw new ApiError(404, 'User not found');
  }

  if (username && username !== user.username) {
    const existingUserName = await User.findOne({
      where: {
        username,
        id: { [Op.ne]: user.id },
      },
    });
    if (existingUserName) {
      throw new ApiError(400, 'Username taken, choose another username');
    }
  }

  await user.update({
    name: name ?? user.name,
    username: username ?? user.username,
    phone: phone ?? user.phone,
    gender: gender ?? user.gender,
    country: country ?? user.country,
    city: city ?? user.city,
  });

  const sanitizedUser = sanitizeObject(user.toJSON(), [
    'password',
    'otp',
    'otp_expires',
    'otpType',
  ]);

  res
    .status(200)
    .json(new ApiResponse(200, { user: sanitizedUser }, 'Profile updated successfully'));
});

// @desc    Get my activity + energy points summary (employees only)
// @route   GET /api/v1/user/me/energy-summary
// @access  Private
const getMyEnergySummary = asyncHandler(async (req, res) => {
  const user = await User.findByPk(req.user.id, {
    attributes: { exclude: ['password', 'otp', 'otp_expires', 'otpType'] },
  });

  if (!user) {
    throw new ApiError(404, 'User not found');
  }

  const looksLikeVideoUrl = (url) => {
    if (!url || typeof url !== 'string') return false;
    const clean = url.split('?')[0].toLowerCase();
    return (
      clean.endsWith('.mp4') ||
      clean.endsWith('.mov') ||
      clean.endsWith('.m4v') ||
      clean.endsWith('.webm') ||
      clean.endsWith('.avi')
    );
  };

  const [postsRows, repostsRows] = await Promise.all([
    Post.findAll({
      where: { user_id: user.id },
      order: [["createdAt", "DESC"]],
    }),
    PostRepost.findAll({
      where: { user_id: user.id },
      include: [
        {
          model: Post,
          as: 'post',
          include: [{ model: User, as: 'author', attributes: ['id', 'name', 'role'] }],
        },
      ],
      order: [["createdAt", "DESC"]],
    }),
  ]);

  const posts = postsRows.map((p) => p.toJSON());
  const reposts = repostsRows.map((r) => r.toJSON());
  const reels = posts.filter((p) => Array.isArray(p.media_urls) && p.media_urls.some(looksLikeVideoUrl));

  const isCompanyEmployee = user.role === 'user' && !!user.company_id;
  const data = {
    user,
    activity: {
      posts: posts.length,
      reposts: reposts.length,
      reels: reels.length,
    },
    items: {
      posts,
      reposts,
      reels,
    },
  };

  if (isCompanyEmployee) {
    data.energy_points = {
      total: Number.parseFloat(user.energy_points_balance) || 0,
    };
  }

  res
    .status(200)
    .json(new ApiResponse(200, data, 'Summary retrieved successfully'));
});

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

// @desc    Get my profile (based on token)
// @route   GET /api/v1/user/me
// @access  Private
const getMyProfile = asyncHandler(async (req, res) => {
  const user = await User.findByPk(req.user.id, {
    attributes: { exclude: ['password'] },
  });

  if (!user) {
    throw new ApiError(404, 'User not found');
  }

  let merchant = null;
  let company = null;

  if (user.role === 'merchant') {
    merchant = await Merchant.findOne({
      where: { user_id: user.id },
      attributes: { exclude: ['password'] },
    });
  }

  if (user.role === 'companyadmin') {
    company = await Company.findOne({
      where: { admin_id: user.id },
      attributes: { exclude: ['password'] },
    });
  }

  if (!company && user.role === 'user' && user.company_id) {
    company = await Company.findByPk(user.company_id, {
      attributes: { exclude: ['password'] },
    });
  }

  res.status(200).json(
    new ApiResponse(
      200,
      {
        user,
        merchant: merchant ? merchant.toJSON() : null,
        company: company ? company.toJSON() : null,
      },
      'Profile retrieved successfully'
    )
  );
});

// @desc    Create new user (superadmin-only generic user creation)
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
    role: role || 'user'
  });

  res.status(201).json(
    new ApiResponse(201, { user }, 'User created successfully')
  );
});

// @desc    Create company employee (companyadmin creates users with role 'user')
// @route   POST /api/users/employees
// @access  Private (companyadmin or superadmin)
const createCompanyEmployee = asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new ApiError(400, 'Validation failed', errors.array());
  }

  const { name, email, password, phone, gender } = req.body;

  // Determine company for this admin (or from query for superadmin)
  let companyId = null;

  if (req.user.role === 'companyadmin') {
    const company = await Company.findOne({ where: { admin_id: req.user.id } });
    if (!company) {
      throw new ApiError(404, 'Company not found for this admin');
    }
    companyId = company.id;
  } else if (req.user.role === 'superadmin' && req.body.company_id) {
    companyId = req.body.company_id;
  }

  if (!companyId) {
    throw new ApiError(400, 'Company context is required to create an employee');
  }

  const existingUser = await User.findByEmail(email);
  if (existingUser) {
    throw new ApiError(400, 'User already exists with this email');
  }

  const derivedUsername =
    req.body.username ||
    (email && email.split('@')[0]) ||
    name;

  const user = await User.create({
    name,
    username: derivedUsername,
    email,
    password,
    phone,
    gender: gender || 'male',
    role: 'user',
    company_id: companyId,
  });

  res.status(201).json(
    new ApiResponse(201, { user }, 'Employee created successfully')
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

  // Company admin can only toggle employees in their own company
  if (req.user.role === 'companyadmin') {
    const company = await Company.findOne({ where: { admin_id: req.user.id } });
    if (!company) {
      throw new ApiError(404, 'Company not found for this admin');
    }

    if (user.role !== 'user') {
      throw new ApiError(403, 'You can only enable/disable employees');
    }

    if (!user.company_id || Number(user.company_id) !== Number(company.id)) {
      throw new ApiError(403, 'You can only enable/disable employees in your company');
    }
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
      `User status set to ${user.is_active ? 'active' : 'disabled'} successfully`
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

// @desc    Get employees for a company admin
// @route   GET /api/users/employees
// @access  Private (companyadmin or superadmin)
const getCompanyEmployees = asyncHandler(async (req, res) => {
  const { page, size, is_active } = req.query;
  const { limit, offset } = getPagination(page, size);

  let whereClause = { role: 'user' };

  let companyId = null;

  if (req.user.role === 'companyadmin') {
    const company = await Company.findOne({ where: { admin_id: req.user.id } });
    if (!company) {
      throw new ApiError(404, 'Company not found for this admin');
    }
    companyId = company.id;
  } else if (req.user.role === 'superadmin' && req.query.company_id) {
    companyId = req.query.company_id;
  }

  if (companyId) {
    whereClause.company_id = companyId;
  }

  if (is_active !== undefined) {
    whereClause.is_active = String(is_active) === 'true';
  }

  const data = await User.findAndCountAll({
    where: whereClause,
    limit,
    offset,
    order: [['id', 'DESC']],
    attributes: { exclude: ['password'] },
  });

  const result = getPagingData(data, page, limit);

  res.status(200).json(
    new ApiResponse(200, result, 'Employees retrieved successfully')
  );
});

// @desc    Company admin grants energy points to an employee (deducts company wallet SAR by admin conversion)
// @route   POST /api/users/employees/:id/grant-energy-points
// @access  Private (companyadmin)
const grantEmployeeEnergyPoints = asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new ApiError(400, 'Validation failed', errors.array());
  }

  const employeeId = req.params.id;
  const pointsRaw = req.body?.energy_points ?? req.body?.points;
  const points = Number.parseFloat(pointsRaw);

  if (!Number.isFinite(points) || points <= 0) {
    throw new ApiError(400, 'energy_points must be a number greater than 0');
  }

  const company = await Company.findOne({ where: { admin_id: req.user.id } });
  if (!company) {
    throw new ApiError(404, 'Company not found for this admin');
  }

  const employee = await User.findOne({ where: { id: employeeId, role: 'user' } });
  if (!employee) {
    throw new ApiError(404, 'Employee not found');
  }

  if (!employee.company_id || Number(employee.company_id) !== Number(company.id)) {
    throw new ApiError(403, 'You can only grant points to employees in your company');
  }

  let setting = await EnergyConversionSetting.findOne({ order: [['id', 'ASC']] });
  if (!setting) {
    setting = await EnergyConversionSetting.create({ points_per_sar: 1 });
  }

  const pointsPerSar = Number.parseFloat(setting.points_per_sar);
  if (!Number.isFinite(pointsPerSar) || pointsPerSar <= 0) {
    throw new ApiError(500, 'Invalid energy conversion setting');
  }

  const sarCostRaw = points / pointsPerSar;
  const sarCost = Math.round(sarCostRaw * 100) / 100;
  if (!Number.isFinite(sarCost) || sarCost <= 0) {
    throw new ApiError(400, 'Calculated SAR cost is invalid');
  }

  const walletBalance = Number.parseFloat(company.wallet_balance);
  if (!Number.isFinite(walletBalance) || walletBalance < sarCost) {
    throw new ApiError(400, 'Insufficient company wallet balance');
  }

  const { updatedCompany, updatedEmployee } = await sequelize.transaction(async (t) => {
    return Promise.all([
      Company.decrement('wallet_balance', {
        by: sarCost,
        where: { id: company.id },
        transaction: t,
      }).then(() => Company.findByPk(company.id, { transaction: t })),

      User.increment('energy_points_balance', {
        by: points,
        where: { id: employee.id },
        transaction: t,
      }).then(() =>
        User.findByPk(employee.id, {
          attributes: { exclude: ['password'] },
          transaction: t,
        })
      ),
    ]).then(async ([companyRow, employeeRow]) => {
      const employeeLabel = employee?.name
        ? `${employee.name} (#${employee.id})`
        : `#${employee.id}`;

      await CompanyWalletTransaction.create(
        {
          company_id: company.id,
          created_by_user_id: req.user.id,
          type: 'withdraw',
          status: 'approved',
          amount: sarCost,
          energy_points: points,
          description: `Energy points granted to employee ${employeeLabel}`,
        },
        { transaction: t }
      );

      return { updatedCompany: companyRow, updatedEmployee: employeeRow };
    });
  });

  res.status(200).json(
    new ApiResponse(
      200,
      {
        employee: updatedEmployee,
        company: {
          id: updatedCompany.id,
          wallet_balance: Number.parseFloat(updatedCompany.wallet_balance) || 0,
        },
        conversion: {
          points_per_sar: pointsPerSar,
          sar_cost: sarCost,
          energy_points: points,
        },
      },
      'Energy points granted successfully'
    )
  );
});

// @desc    Request delete verification code for an employee
// @route   POST /api/v1/user/employees/:id/request-delete
// @access  Private (companyadmin)
const requestEmployeeDeleteCode = asyncHandler(async (req, res) => {
  if (req.user.role !== 'companyadmin') {
    throw new ApiError(403, 'Not authorized');
  }

  const employeeId = Number(req.params.id);
  if (!Number.isFinite(employeeId)) {
    throw new ApiError(400, 'Invalid employee id');
  }

  const company = await requireCompanyForAdmin(req.user.id);
  const employee = await findCompanyEmployeeOrThrow({
    companyId: company.id,
    employeeId,
  });

  const code = generate6DigitCode();
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 10 * 60 * 1000);
  const codeHash = hmacSha256Hex(`${company.id}:${req.user.id}:${employee.id}:${code}`);

  const existing = await EmployeeDeleteVerification.findOne({
    where: {
      company_id: company.id,
      company_admin_id: req.user.id,
      employee_id: employee.id,
      consumed_at: { [Op.is]: null },
    },
    order: [['created_at', 'DESC']],
  });

  const record = existing
    ? await existing.update({
        code_hash: codeHash,
        expires_at: expiresAt,
        attempts: 0,
        verified_at: null,
        delete_token_hash: null,
        delete_token_expires_at: null,
        consumed_at: null,
      })
    : await EmployeeDeleteVerification.create({
        company_id: company.id,
        company_admin_id: req.user.id,
        employee_id: employee.id,
        code_hash: codeHash,
        expires_at: expiresAt,
        attempts: 0,
      });

  await sendEmail({
    to: company.email,
    subject: 'Employee delete verification code',
    html: `
      <h2>Delete Employee Verification</h2>
      <p>Hi <strong>${company.name}</strong>,</p>
      <p>You requested to delete employee:</p>
      <p><strong>${employee.name || employee.email}</strong></p>
      <p>Your 6-digit verification code is:</p>

      <div style="
        font-size: 28px;
        font-weight: bold;
        background-color: #f3f4f6;
        color: #111827;
        padding: 12px 20px;
        display: inline-block;
        border-radius: 8px;
        letter-spacing: 4px;
        margin: 10px 0;
      ">${code}</div>

      <p>This code will expire in <strong>10 minutes</strong>.</p>
      <p>If you didn’t request this, you can ignore this email.</p>
      <br />
      <p>MoreApp Team</p>
    `,
  });

  res.status(200).json(
    new ApiResponse(
      200,
      {
        verification_id: record.id,
        expires_in_seconds: 10 * 60,
        sent_to: company.email,
      },
      'Verification code sent'
    )
  );
});

// @desc    Verify delete code and issue one-time delete token
// @route   POST /api/v1/user/employees/:id/verify-delete
// @access  Private (companyadmin)
const verifyEmployeeDeleteCode = asyncHandler(async (req, res) => {
  if (req.user.role !== 'companyadmin') {
    throw new ApiError(403, 'Not authorized');
  }

  const employeeId = Number(req.params.id);
  const { code, verification_id } = req.body || {};
  const inputCode = String(code || '').trim();
  const verificationId = Number(verification_id);

  if (!Number.isFinite(employeeId)) {
    throw new ApiError(400, 'Invalid employee id');
  }
  if (!Number.isFinite(verificationId)) {
    throw new ApiError(400, 'verification_id is required');
  }
  if (!/^[0-9]{6}$/.test(inputCode)) {
    throw new ApiError(400, 'Code must be 6 digits');
  }

  const company = await requireCompanyForAdmin(req.user.id);
  await findCompanyEmployeeOrThrow({ companyId: company.id, employeeId });

  const record = await EmployeeDeleteVerification.findOne({
    where: {
      id: verificationId,
      company_id: company.id,
      company_admin_id: req.user.id,
      employee_id: employeeId,
      consumed_at: { [Op.is]: null },
    },
  });

  if (!record) {
    throw new ApiError(404, 'Verification request not found');
  }

  const now = new Date();
  if (record.expires_at && now > new Date(record.expires_at)) {
    throw new ApiError(400, 'Verification code expired');
  }

  if ((record.attempts || 0) >= 5) {
    throw new ApiError(429, 'Too many attempts. Please request a new code');
  }

  const expectedHash = hmacSha256Hex(`${company.id}:${req.user.id}:${employeeId}:${inputCode}`);
  const matches = record.code_hash === expectedHash;

  await record.update({ attempts: (record.attempts || 0) + 1 });
  if (!matches) {
    throw new ApiError(400, 'Invalid verification code');
  }

  const deleteToken = crypto.randomBytes(24).toString('hex');
  const deleteTokenHash = sha256Hex(`${company.id}:${req.user.id}:${employeeId}:${deleteToken}`);
  const deleteTokenExpiresAt = new Date(now.getTime() + 10 * 60 * 1000);

  await record.update({
    verified_at: now,
    delete_token_hash: deleteTokenHash,
    delete_token_expires_at: deleteTokenExpiresAt,
  });

  res.status(200).json(
    new ApiResponse(
      200,
      {
        delete_token: deleteToken,
        expires_in_seconds: 10 * 60,
      },
      'Verification successful'
    )
  );
});

// @desc    Delete an employee (companyadmin) using verified delete token
// @route   DELETE /api/v1/user/employees/:id
// @access  Private (companyadmin)
const deleteCompanyEmployee = asyncHandler(async (req, res) => {
  if (req.user.role !== 'companyadmin') {
    throw new ApiError(403, 'Not authorized');
  }

  const employeeId = Number(req.params.id);
  if (!Number.isFinite(employeeId)) {
    throw new ApiError(400, 'Invalid employee id');
  }

  const deleteToken = String(req.header('x-delete-token') || '').trim();
  if (!deleteToken) {
    throw new ApiError(400, 'Delete token is required');
  }

  const company = await requireCompanyForAdmin(req.user.id);
  const employee = await findCompanyEmployeeOrThrow({
    companyId: company.id,
    employeeId,
  });

  const deleteTokenHash = sha256Hex(`${company.id}:${req.user.id}:${employeeId}:${deleteToken}`);
  const record = await EmployeeDeleteVerification.findOne({
    where: {
      company_id: company.id,
      company_admin_id: req.user.id,
      employee_id: employeeId,
      delete_token_hash: deleteTokenHash,
      consumed_at: { [Op.is]: null },
    },
    order: [['created_at', 'DESC']],
  });

  if (!record) {
    throw new ApiError(403, 'Invalid or missing delete verification');
  }

  const now = new Date();
  if (!record.delete_token_expires_at || now > new Date(record.delete_token_expires_at)) {
    throw new ApiError(400, 'Delete token expired');
  }

  await sequelize.transaction(async (t) => {
    await employee.destroy({ transaction: t });
    await record.update({ consumed_at: now }, { transaction: t });
  });

  res.status(200).json(new ApiResponse(200, null, 'Employee deleted successfully'));
});

module.exports = {
  getAllUsers,
  getUserById,
  getMyProfile,
  updateMyProfile,
  getMyEnergySummary,
  createUser,
  updateUser,
  deleteUser,
  toggleUserStatus,
  requestEmployeeDeleteCode,
  verifyEmployeeDeleteCode,
  deleteCompanyEmployee,
  searchUsers,
  createCompanyEmployee,
  getCompanyEmployees,
  grantEmployeeEnergyPoints,
  // searchCustomers

};