const { sequelize } = require('../config/db');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const ApiResponse = require('../utils/ApiResponse');

const Company = require('../models/Company');
const CompanyWalletTransaction = require('../models/CompanyWalletTransaction');
const EnergyConversionSetting = require('../models/EnergyConversionSetting');
const User = require('../models/User');

const extractEmployeeId = (description) => {
  if (!description) return null;
  const text = String(description);
  const match = text.match(/employee\s*#(\d+)/i);
  if (!match) return null;
  const id = Number.parseInt(match[1], 10);
  return Number.isFinite(id) && id > 0 ? id : null;
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

const getMyCompany = async (userId) => {
  const company = await Company.findOne({ where: { admin_id: userId } });
  return company;
};

// @desc   Company wallet (balance + recent transactions)
// @route  GET /api/v1/dashboard/company/wallet?limit=25
// @access Private (companyadmin)
exports.getCompanyWallet = asyncHandler(async (req, res) => {
  const company = await getMyCompany(req.user.id);
  if (!company) {
    throw new ApiError(404, 'Company profile not found for current admin');
  }

  const limit = Math.min(Math.max(parseInt(req.query.limit || '25', 10), 1), 100);

  const transactions = await CompanyWalletTransaction.findAll({
    where: { company_id: company.id },
    order: [['created_at', 'DESC']],
    limit,
  });

  const employeeIds = Array.from(
    new Set(transactions.map((t) => extractEmployeeId(t.description)).filter(Boolean))
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

  const balance = toMoney(company.wallet_balance) ?? 0;
  const energyPointsBalance = toPoints(company.energy_points_balance) ?? 0;

  res.status(200).json(
    new ApiResponse(
      200,
      {
        wallet: {
          balance,
          energy_points_balance: energyPointsBalance,
        },
        transactions: transactions.map((t) => ({
          id: t.id,
          type: t.type,
          status: t.status,
          amount: toMoney(t.amount) ?? 0,
          energy_points: t.energy_points === null || t.energy_points === undefined ? null : (toPoints(t.energy_points) ?? 0),
          description: (() => {
            const employeeId = extractEmployeeId(t.description);
            if (!employeeId) return t.description;
            const employee = employeeById.get(employeeId);
            if (!employee?.name) return t.description;
            return `Energy points granted to employee ${employee.name} (#${employeeId})`;
          })(),
          createdAt: t.createdAt,
          updatedAt: t.updatedAt,
        })),
      },
      'Company wallet retrieved successfully'
    )
  );
});

// @desc   Deposit to company wallet
// @route  POST /api/v1/dashboard/company/wallet/deposit
// @access Private (companyadmin)
exports.depositCompanyWallet = asyncHandler(async (req, res) => {
  const company = await getMyCompany(req.user.id);
  if (!company) {
    throw new ApiError(404, 'Company profile not found for current admin');
  }

  const amount = toMoney(req.body?.amount);
  if (amount === null || amount <= 0) {
    throw new ApiError(400, 'amount must be a number greater than 0');
  }

  const description = typeof req.body?.description === 'string' ? req.body.description.trim() : null;

  // Get conversion (default: 1 point per SAR)
  const setting = await EnergyConversionSetting.findOne({ order: [['id', 'ASC']] });
  const pointsPerSar = Number.parseFloat(setting?.points_per_sar ?? 1);
  const safePointsPerSar = Number.isFinite(pointsPerSar) && pointsPerSar > 0 ? pointsPerSar : 1;
  const energyPoints = toPoints(amount * safePointsPerSar) ?? 0;

  let createdTx = null;

  await sequelize.transaction(async (t) => {
    await Company.increment('wallet_balance', {
      by: amount,
      where: { id: company.id },
      transaction: t,
    });

    await Company.increment('energy_points_balance', {
      by: energyPoints,
      where: { id: company.id },
      transaction: t,
    });

    createdTx = await CompanyWalletTransaction.create(
      {
        company_id: company.id,
        created_by_user_id: req.user.id,
        type: 'deposit',
        status: 'approved',
        amount,
        energy_points: energyPoints,
        description: description || 'Wallet deposit',
      },
      { transaction: t }
    );
  });

  const updatedCompany = await Company.findByPk(company.id);

  res.status(200).json(
    new ApiResponse(
      200,
      {
        wallet: {
          balance: toMoney(updatedCompany.wallet_balance) ?? 0,
          energy_points_balance: toPoints(updatedCompany.energy_points_balance) ?? 0,
        },
        transaction: {
          id: createdTx.id,
          type: createdTx.type,
          status: createdTx.status,
          amount: toMoney(createdTx.amount) ?? 0,
          energy_points: createdTx.energy_points === null || createdTx.energy_points === undefined ? null : (toPoints(createdTx.energy_points) ?? 0),
          description: createdTx.description,
          createdAt: createdTx.createdAt,
        },
      },
      'Deposit successful'
    )
  );
});
