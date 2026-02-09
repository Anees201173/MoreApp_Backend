const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const ApiResponse = require('../utils/ApiResponse');

const EnergyConversionSetting = require('../models/EnergyConversionSetting');

const toNumber = (v) => {
  const n = Number.parseFloat(v);
  if (!Number.isFinite(n)) return null;
  return n;
};

const ensureSingleRow = async () => {
  let row = await EnergyConversionSetting.findOne({ order: [['id', 'ASC']] });
  if (!row) {
    row = await EnergyConversionSetting.create({ points_per_sar: 1 });
  }
  return row;
};

// @desc   Get current SAR -> energy points conversion
// @route  GET /api/v1/dashboard/superadmin/energy-conversion
// @access Private (superadmin)
exports.getEnergyConversion = asyncHandler(async (req, res) => {
  const row = await ensureSingleRow();

  res.status(200).json(
    new ApiResponse(
      200,
      {
        points_per_sar: Number(row.points_per_sar),
        updatedAt: row.updatedAt,
      },
      'Energy conversion retrieved successfully'
    )
  );
});

// @desc   Update SAR -> energy points conversion
// @route  PUT /api/v1/dashboard/superadmin/energy-conversion
// @access Private (superadmin)
exports.updateEnergyConversion = asyncHandler(async (req, res) => {
  const pointsPerSar = toNumber(req.body?.points_per_sar);
  if (pointsPerSar === null || pointsPerSar <= 0) {
    throw new ApiError(400, 'points_per_sar must be a number greater than 0');
  }

  const row = await ensureSingleRow();
  row.points_per_sar = pointsPerSar;
  row.updated_by_user_id = req.user?.id || null;
  if (!row.created_by_user_id) row.created_by_user_id = req.user?.id || null;
  await row.save();

  res.status(200).json(
    new ApiResponse(
      200,
      {
        points_per_sar: Number(row.points_per_sar),
        updatedAt: row.updatedAt,
      },
      'Energy conversion updated successfully'
    )
  );
});
