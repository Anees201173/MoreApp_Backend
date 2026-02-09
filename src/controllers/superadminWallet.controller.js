const { Op } = require('sequelize');

const asyncHandler = require('../utils/asyncHandler');
const ApiResponse = require('../utils/ApiResponse');

const Company = require('../models/Company');
const CompanyWalletTransaction = require('../models/CompanyWalletTransaction');
const User = require('../models/User');

const extractEmployeeId = (description) => {
  if (!description) return null;
  const text = String(description);
  const match = text.match(/employee\s*#(\d+)/i);
  if (!match) return null;
  const id = Number.parseInt(match[1], 10);
  return Number.isFinite(id) && id > 0 ? id : null;
};

const toInt = (v, fallback) => {
  const n = Number.parseInt(v, 10);
  return Number.isFinite(n) && n > 0 ? n : fallback;
};

const toNumber = (v) => {
  const n = Number.parseFloat(v);
  if (!Number.isFinite(n)) return 0;
  return n;
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
