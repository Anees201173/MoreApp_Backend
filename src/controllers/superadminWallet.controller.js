const { Op } = require('sequelize');
const { sequelize } = require('../config/db');

const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const ApiResponse = require('../utils/ApiResponse');

const Company = require('../models/Company');
const CompanyWalletTransaction = require('../models/CompanyWalletTransaction');
const User = require('../models/User');

const toInt = (v, fallback) => {
  const n = Number.parseInt(v, 10);
  return Number.isFinite(n) && n > 0 ? n : fallback;
};

const toMaybePositiveInt = (v) => {
  if (v === undefined || v === null || String(v).trim() === '') return null;
  const n = Number.parseInt(v, 10);
  return Number.isFinite(n) && n > 0 ? n : null;
};

const toMoney = (value) => {
  const num = Number.parseFloat(value);
  if (!Number.isFinite(num)) return null;
  return Math.round(num * 100) / 100;
};

const toPoints = (value) => {
  const num = Number.parseFloat(value);
  if (!Number.isFinite(num)) return null;
  return Math.round(num * 100) / 100;
};

const extractEmployeeId = (description) => {
  if (!description) return null;
  const text = String(description);
  const match = text.match(/employee\s*#(\d+)/i);
  if (!match) return null;
  const id = Number.parseInt(match[1], 10);
  return Number.isFinite(id) && id > 0 ? id : null;
};

const toNumber = (v) => {
  const n = Number.parseFloat(v);
  if (!Number.isFinite(n)) return 0;
  return n;
};

const normalizeTx = (t) => {
  if (!t) return null;
  return {
    id: t.id,
    company_id: t.company_id,
    type: t.type,
    status: t.status,
    amount: toMoney(t.amount) ?? 0,
    energy_points:
      t.energy_points === null || t.energy_points === undefined
        ? null
        : (toPoints(t.energy_points) ?? 0),
    description: t.description,
    createdAt: t.createdAt,
    updatedAt: t.updatedAt,
    company: t.company
      ? {
          id: t.company.id,
          name: t.company.name,
          email: t.company.email,
        }
      : undefined,
    createdBy: t.createdBy
      ? {
          id: t.createdBy.id,
          name: t.createdBy.name,
          username: t.createdBy.username,
          email: t.createdBy.email,
        }
      : undefined,
  };
};

// @desc   Superadmin wallet overview (company balances + recent transactions)
// @route  GET /api/v1/dashboard/superadmin/wallet-overview
// @access Private (superadmin)
exports.getSuperadminWalletOverview = asyncHandler(async (req, res) => {
  const page = toInt(req.query?.page, 1);
  const size = toInt(req.query?.size, 20);
  const search = (req.query?.search || '').trim();

  const where = {};
  if (search) {
    where[Op.or] = [
      { name: { [Op.iLike]: `%${search}%` } },
      { email: { [Op.iLike]: `%${search}%` } },
    ];
  }

  const offset = (page - 1) * size;

  const [totalWalletBalance, totalEnergyPointsBalance, totalCompanies, companies, recentTransactions] =
    await Promise.all([
      Company.sum('wallet_balance'),
      Company.sum('energy_points_balance'),
      Company.count({ where }),
      Company.findAll({
        where,
        attributes: ['id', 'name', 'email', 'wallet_balance', 'energy_points_balance', 'updatedAt'],
        order: [['updatedAt', 'DESC']],
        limit: size,
        offset,
      }),
      CompanyWalletTransaction.findAll({
        limit: 10,
        order: [['createdAt', 'DESC']],
        attributes: ['id', 'company_id', 'type', 'status', 'amount', 'energy_points', 'description', 'createdAt'],
        include: [
          {
            model: Company,
            as: 'company',
            attributes: ['id', 'name'],
          },
          {
            model: User,
            as: 'createdBy',
            attributes: ['id', 'name', 'username', 'email'],
            required: false,
          },
        ],
      }),
    ]);

  const employeeIds = Array.from(
    new Set(recentTransactions.map((t) => extractEmployeeId(t.description)).filter(Boolean))
  );
  const employeeById = new Map();
  if (employeeIds.length > 0) {
    const employees = await User.findAll({
      where: { id: employeeIds },
      attributes: ['id', 'name'],
    });
    for (const e of employees) {
      employeeById.set(e.id, e);
    }
  }

  const enrichedRecentTransactions = recentTransactions.map((t) => {
    const employeeId = extractEmployeeId(t.description);
    if (!employeeId) return t;
    const employee = employeeById.get(employeeId);
    if (!employee?.name) return t;
    return {
      ...t.toJSON(),
      description: `Energy points granted to employee ${employee.name} (#${employeeId})`,
    };
  });

  res.status(200).json(
    new ApiResponse(
      200,
      {
        totals: {
          companies: totalCompanies,
          wallet_balance: toNumber(totalWalletBalance),
          energy_points_balance: toNumber(totalEnergyPointsBalance),
        },
        pagination: {
          page,
          size,
          totalItems: totalCompanies,
          totalPages: Math.ceil(totalCompanies / size),
        },
        companies,
        recentTransactions: enrichedRecentTransactions,
      },
      'Superadmin wallet overview retrieved successfully'
    )
  );
});

// @desc   Superadmin: list pending company wallet deposit requests
// @route  GET /api/v1/dashboard/superadmin/wallet/pending-deposits?page=1&size=20&search=
// @access Private (superadmin)
exports.getPendingCompanyWalletDeposits = asyncHandler(async (req, res) => {
  const page = toInt(req.query?.page, 1);
  const size = Math.min(toInt(req.query?.size, 20), 100);
  const search = (req.query?.search || '').trim();

  const offset = (page - 1) * size;

  const companyWhere = {};
  if (search) {
    companyWhere[Op.or] = [
      { name: { [Op.iLike]: `%${search}%` } },
      { email: { [Op.iLike]: `%${search}%` } },
    ];
  }

  const result = await CompanyWalletTransaction.findAndCountAll({
    where: { type: 'deposit', status: 'pending' },
    include: [
      {
        model: Company,
        as: 'company',
        attributes: ['id', 'name', 'email'],
        where: companyWhere,
        required: true,
      },
      {
        model: User,
        as: 'createdBy',
        attributes: ['id', 'name', 'username', 'email'],
        required: false,
      },
    ],
    order: [['createdAt', 'DESC']],
    limit: size,
    offset,
  });

  res.status(200).json(
    new ApiResponse(
      200,
      {
        items: result.rows.map(normalizeTx),
        pagination: {
          page,
          size,
          totalItems: result.count,
          totalPages: Math.ceil(result.count / size),
        },
      },
      'Pending deposit requests retrieved successfully'
    )
  );
});

// @desc   Superadmin: list wallet transactions (paginated)
// @route  GET /api/v1/dashboard/superadmin/wallet/transactions?page=1&size=20&search=&type=&status=&company_id=
// @access Private (superadmin)
exports.getCompanyWalletTransactions = asyncHandler(async (req, res) => {
  const page = toInt(req.query?.page, 1);
  const size = Math.min(toInt(req.query?.size, 20), 100);
  const search = (req.query?.search || '').trim();

  const type = req.query?.type ? String(req.query.type).trim() : null;
  const status = req.query?.status ? String(req.query.status).trim() : null;
  const companyId = toMaybePositiveInt(req.query?.company_id);

  const offset = (page - 1) * size;

  const where = {};
  if (type) where.type = type;
  if (status) where.status = status;
  if (companyId) where.company_id = companyId;

  const companyWhere = {};
  if (search) {
    companyWhere[Op.or] = [
      { name: { [Op.iLike]: `%${search}%` } },
      { email: { [Op.iLike]: `%${search}%` } },
    ];
  }

  const result = await CompanyWalletTransaction.findAndCountAll({
    where,
    include: [
      {
        model: Company,
        as: 'company',
        attributes: ['id', 'name', 'email'],
        where: Object.keys(companyWhere).length ? companyWhere : undefined,
        required: !!search,
      },
      {
        model: User,
        as: 'createdBy',
        attributes: ['id', 'name', 'username', 'email'],
        required: false,
      },
    ],
    order: [['createdAt', 'DESC']],
    limit: size,
    offset,
  });

  res.status(200).json(
    new ApiResponse(
      200,
      {
        items: result.rows.map(normalizeTx),
        pagination: {
          page,
          size,
          totalItems: result.count,
          totalPages: Math.ceil(result.count / size),
        },
      },
      'Wallet transactions retrieved successfully'
    )
  );
});

// @desc   Superadmin: list user-related wallet transactions (paginated)
// @route  GET /api/v1/dashboard/superadmin/user-wallet/transactions?page=1&size=20&search=&user_id=
// @access Private (superadmin)
exports.getUserWalletTransactions = asyncHandler(async (req, res) => {
  const page = toInt(req.query?.page, 1);
  const size = Math.min(toInt(req.query?.size, 20), 100);
  const search = (req.query?.search || '').trim();
  const userId = toMaybePositiveInt(req.query?.user_id);

  const offset = (page - 1) * size;

  // Transactions that mention employee #<id> in description.
  const where = {
    description: { [Op.iLike]: '%employee%#%' },
  };

  const result = await CompanyWalletTransaction.findAndCountAll({
    where,
    include: [
      { model: Company, as: 'company', attributes: ['id', 'name', 'email'], required: false },
      { model: User, as: 'createdBy', attributes: ['id', 'name', 'username', 'email'], required: false },
    ],
    order: [['createdAt', 'DESC']],
    limit: size,
    offset,
  });

  const employeeIds = Array.from(
    new Set(result.rows.map((t) => extractEmployeeId(t.description)).filter(Boolean))
  );

  const employeeWhere = { id: employeeIds };
  if (userId) {
    employeeWhere.id = [userId];
  }

  let employees = [];
  if (employeeIds.length > 0) {
    employees = await User.findAll({
      where: employeeWhere,
      attributes: ['id', 'name', 'email'],
    });
  }

  const employeeById = new Map();
  for (const e of employees) employeeById.set(e.id, e);

  const filteredRows = userId
    ? result.rows.filter((t) => extractEmployeeId(t.description) === userId)
    : result.rows;

  const items = filteredRows
    .map((t) => {
      const normalized = normalizeTx(t);
      const employeeId = extractEmployeeId(t.description);
      if (!employeeId) return normalized;
      const employee = employeeById.get(employeeId);

      return {
        ...normalized,
        employee: employee ? { id: employee.id, name: employee.name, email: employee.email } : { id: employeeId },
        description:
          employee?.name
            ? `Energy points granted to ${employee.name} (#${employeeId})`
            : normalized.description,
      };
    })
    .filter(Boolean);

  res.status(200).json(
    new ApiResponse(
      200,
      {
        items,
        pagination: {
          page,
          size,
          totalItems: userId ? items.length : result.count,
          totalPages: userId ? Math.max(1, Math.ceil(items.length / size)) : Math.ceil(result.count / size),
        },
      },
      'User wallet transactions retrieved successfully'
    )
  );
});

// @desc   Superadmin: approve a pending company wallet deposit
// @route  PATCH /api/v1/dashboard/superadmin/wallet/transactions/:id/approve
// @access Private (superadmin)
exports.approveCompanyWalletDeposit = asyncHandler(async (req, res) => {
  const id = Number.parseInt(req.params?.id, 10);
  if (!Number.isFinite(id) || id <= 0) {
    throw new ApiError(400, 'Invalid transaction id');
  }

  let updatedTx = null;
  let updatedCompany = null;

  await sequelize.transaction(async (t) => {
    const tx = await CompanyWalletTransaction.findOne({
      where: { id },
      transaction: t,
      lock: t.LOCK.UPDATE,
    });

    if (!tx) throw new ApiError(404, 'Transaction not found');
    if (tx.type !== 'deposit') throw new ApiError(400, 'Only deposit transactions can be approved');
    if (tx.status !== 'pending') throw new ApiError(400, 'Only pending transactions can be approved');

    const amount = toMoney(tx.amount);
    if (amount === null || amount <= 0) {
      throw new ApiError(400, 'Invalid transaction amount');
    }

    const energyPoints = tx.energy_points === null || tx.energy_points === undefined ? 0 : (toPoints(tx.energy_points) ?? 0);

    await Company.increment('wallet_balance', {
      by: amount,
      where: { id: tx.company_id },
      transaction: t,
    });

    await Company.increment('energy_points_balance', {
      by: energyPoints,
      where: { id: tx.company_id },
      transaction: t,
    });

    await tx.update({ status: 'approved' }, { transaction: t });

    updatedTx = await CompanyWalletTransaction.findByPk(id, {
      transaction: t,
      include: [
        { model: Company, as: 'company', attributes: ['id', 'name', 'email'], required: false },
        { model: User, as: 'createdBy', attributes: ['id', 'name', 'username', 'email'], required: false },
      ],
    });

    updatedCompany = await Company.findByPk(tx.company_id, {
      transaction: t,
      attributes: ['id', 'wallet_balance', 'energy_points_balance'],
    });
  });

  res.status(200).json(
    new ApiResponse(
      200,
      {
        transaction: normalizeTx(updatedTx),
        companyWallet: {
          company_id: updatedCompany?.id,
          balance: toMoney(updatedCompany?.wallet_balance) ?? 0,
          energy_points_balance: toPoints(updatedCompany?.energy_points_balance) ?? 0,
        },
      },
      'Deposit approved successfully'
    )
  );
});

// @desc   Superadmin: reject a pending company wallet deposit
// @route  PATCH /api/v1/dashboard/superadmin/wallet/transactions/:id/reject
// @access Private (superadmin)
exports.rejectCompanyWalletDeposit = asyncHandler(async (req, res) => {
  const id = Number.parseInt(req.params?.id, 10);
  if (!Number.isFinite(id) || id <= 0) {
    throw new ApiError(400, 'Invalid transaction id');
  }

  const tx = await CompanyWalletTransaction.findOne({ where: { id } });
  if (!tx) throw new ApiError(404, 'Transaction not found');
  if (tx.type !== 'deposit') throw new ApiError(400, 'Only deposit transactions can be rejected');
  if (tx.status !== 'pending') throw new ApiError(400, 'Only pending transactions can be rejected');

  await tx.update({ status: 'rejected' });

  const enriched = await CompanyWalletTransaction.findByPk(id, {
    include: [
      { model: Company, as: 'company', attributes: ['id', 'name', 'email'], required: false },
      { model: User, as: 'createdBy', attributes: ['id', 'name', 'username', 'email'], required: false },
    ],
  });

  res.status(200).json(
    new ApiResponse(200, { transaction: normalizeTx(enriched) }, 'Deposit rejected successfully')
  );
});
