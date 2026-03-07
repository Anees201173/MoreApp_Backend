const ApiError = require('../utils/ApiError');

const EnergyConversionSetting = require('../models/EnergyConversionSetting');
const { Merchant, EnergyEarningPolicy } = require('../models');

const toNumber = (v) => {
  const n = Number.parseFloat(v);
  if (!Number.isFinite(n)) return null;
  return n;
};

const round2 = (n) => Number((toNumber(n) ?? 0).toFixed(2));

const ensureConversionRow = async (transaction) => {
  let row = await EnergyConversionSetting.findOne({
    order: [['id', 'ASC']],
    transaction,
    lock: transaction ? transaction.LOCK.UPDATE : undefined,
  });
  if (!row) {
    row = await EnergyConversionSetting.create({ points_per_sar: 1 }, { transaction });
  }
  return row;
};

const getPointsPerSar = async (transaction) => {
  const row = await ensureConversionRow(transaction);
  const val = toNumber(row.points_per_sar);
  if (val === null || val <= 0) throw new ApiError(500, 'Invalid points_per_sar conversion setting');
  return val;
};

const clampPercent = (v) => {
  const n = toNumber(v);
  if (n === null) return 0;
  if (n < 0) return 0;
  if (n > 100) return 100;
  return n;
};

const computeEarnedPoints = ({ amountSar, pointsPerSar, percent }) => {
  const amount = toNumber(amountSar) ?? 0;
  const pps = toNumber(pointsPerSar) ?? 0;
  const pct = clampPercent(percent);
  if (amount <= 0 || pps <= 0 || pct <= 0) return 0;
  return round2(amount * pps * (pct / 100));
};

const getMerchantPolicy = async (merchantId, transaction) => {
  const merchant = await Merchant.findByPk(merchantId, {
    attributes: ['id', 'energy_earning_policy_id'],
    transaction,
  });
  if (!merchant) throw new ApiError(404, 'Merchant not found');

  const policy = await EnergyEarningPolicy.findByPk(merchant.energy_earning_policy_id, {
    transaction,
  });
  if (!policy || !policy.is_active) {
    // Fall back to first active policy
    const fallback = await EnergyEarningPolicy.findOne({ where: { is_active: true }, order: [['id', 'ASC']], transaction });
    if (!fallback) throw new ApiError(500, 'No active energy earning policy is configured');
    return fallback;
  }

  return policy;
};

module.exports = {
  getPointsPerSar,
  computeEarnedPoints,
  getMerchantPolicy,
};
