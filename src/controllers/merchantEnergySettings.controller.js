const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const ApiResponse = require('../utils/ApiResponse');

const { Merchant } = require('../models');

const { getPointsPerSar, getMerchantPolicy } = require('../services/energyEarning.service');

// @desc   Get merchant energy earning settings (conversion + policy)
// @route  GET /api/v1/dashboard/merchant/energy-earning-settings
// @access Private (merchant)
exports.getMerchantEnergyEarningSettings = asyncHandler(async (req, res) => {
  if (!req.user) throw new ApiError(401, 'Not authorized');
  if (req.user.role !== 'merchant') throw new ApiError(403, 'Only merchants can access this resource');

  const merchant = await Merchant.findOne({ where: { user_id: req.user.id } });
  if (!merchant) throw new ApiError(403, 'Merchant profile not found');

  const pointsPerSar = await getPointsPerSar();
  const policy = await getMerchantPolicy(merchant.id);

  res.status(200).json(
    new ApiResponse(
      200,
      {
        points_per_sar: pointsPerSar,
        policy: policy
          ? {
              id: policy.id,
              name: policy.name,
              percent_ecommerce: Number(policy.percent_ecommerce ?? 0),
              percent_field_booking: Number(policy.percent_field_booking ?? 0),
              percent_subscription: Number(policy.percent_subscription ?? 0),
            }
          : null,
      },
      'Merchant energy earning settings retrieved successfully'
    )
  );
});
