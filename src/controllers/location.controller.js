const { Country, City, sequelize } = require('../models');
const { Op } = require('sequelize');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const ApiResponse = require('../utils/ApiResponse');

const normalizeName = (v) => String(v ?? '').trim();

const ensureSuperadmin = (req) => {
  if (!req.user || req.user.role !== 'superadmin') {
    throw new ApiError(403, 'Not authorized');
  }
};

// Countries
exports.listCountries = asyncHandler(async (req, res) => {
  const includeInactive = String(req.query.include_inactive || '').toLowerCase() === 'true';
  const where = {};

  if (!(req.user && req.user.role === 'superadmin' && includeInactive)) {
    where.is_active = true;
  }

  const items = await Country.findAll({ where, order: [['name', 'ASC']] });
  res.status(200).json(new ApiResponse(200, { items }, 'Countries retrieved'));
});

exports.createCountry = asyncHandler(async (req, res) => {
  ensureSuperadmin(req);

  const name = normalizeName(req.body.name);
  if (!name) throw new ApiError(400, 'Country name is required');

  const existing = await Country.findOne({
    where: sequelize.where(sequelize.fn('lower', sequelize.col('name')), name.toLowerCase()),
  });
  if (existing) throw new ApiError(400, 'Country already exists');

  const country = await Country.create({ name });
  res.status(201).json(new ApiResponse(201, { country }, 'Country created'));
});

exports.updateCountry = asyncHandler(async (req, res) => {
  ensureSuperadmin(req);

  const { id } = req.params;
  const country = await Country.findByPk(id);
  if (!country) throw new ApiError(404, 'Country not found');

  const name = req.body.name !== undefined ? normalizeName(req.body.name) : undefined;
  const is_active = req.body.is_active;

  if (name !== undefined) {
    if (!name) throw new ApiError(400, 'Country name is required');

    const existing = await Country.findOne({
      where: {
        id: { [Op.ne]: country.id },
        [Op.and]: sequelize.where(
          sequelize.fn('lower', sequelize.col('name')),
          name.toLowerCase()
        ),
      },
    });
    if (existing) throw new ApiError(400, 'Country already exists');
  }

  await country.update({
    name: name !== undefined ? name : country.name,
    is_active: typeof is_active === 'boolean' ? is_active : country.is_active,
  });

  res.status(200).json(new ApiResponse(200, { country }, 'Country updated'));
});

exports.toggleCountryStatus = asyncHandler(async (req, res) => {
  ensureSuperadmin(req);

  const { id } = req.params;
  const country = await Country.findByPk(id);
  if (!country) throw new ApiError(404, 'Country not found');

  await country.update({ is_active: !country.is_active });
  res.status(200).json(new ApiResponse(200, { country }, 'Country status updated'));
});

exports.deleteCountry = asyncHandler(async (req, res) => {
  ensureSuperadmin(req);

  const { id } = req.params;
  const country = await Country.findByPk(id);
  if (!country) throw new ApiError(404, 'Country not found');

  // Soft-delete to avoid breaking existing field_locations references.
  await country.update({ is_active: false });
  res.status(200).json(new ApiResponse(200, null, 'Country deleted'));
});

// Cities
exports.listCities = asyncHandler(async (req, res) => {
  const includeInactive = String(req.query.include_inactive || '').toLowerCase() === 'true';
  const countryId = req.query.country_id ?? req.query.countryId;

  const where = {};
  if (countryId !== undefined && countryId !== null && String(countryId).trim() !== '') {
    where.country_id = Number(countryId);
  }

  if (!(req.user && req.user.role === 'superadmin' && includeInactive)) {
    where.is_active = true;
  }

  const items = await City.findAll({ where, order: [['name', 'ASC']] });
  res.status(200).json(new ApiResponse(200, { items }, 'Cities retrieved'));
});

exports.createCity = asyncHandler(async (req, res) => {
  ensureSuperadmin(req);

  const country_id = Number(req.body.country_id ?? req.body.countryId);
  const name = normalizeName(req.body.name);

  if (!Number.isFinite(country_id)) throw new ApiError(400, 'country_id is required');
  if (!name) throw new ApiError(400, 'City name is required');

  const country = await Country.findByPk(country_id);
  if (!country) throw new ApiError(404, 'Country not found');

  const existing = await City.findOne({
    where: {
      country_id,
      [Op.and]: sequelize.where(sequelize.fn('lower', sequelize.col('name')), name.toLowerCase()),
    },
  });
  if (existing) throw new ApiError(400, 'City already exists for this country');

  const city = await City.create({ country_id, name });
  res.status(201).json(new ApiResponse(201, { city }, 'City created'));
});

exports.updateCity = asyncHandler(async (req, res) => {
  ensureSuperadmin(req);

  const { id } = req.params;
  const city = await City.findByPk(id);
  if (!city) throw new ApiError(404, 'City not found');

  const name = req.body.name !== undefined ? normalizeName(req.body.name) : undefined;
  const is_active = req.body.is_active;

  if (name !== undefined) {
    if (!name) throw new ApiError(400, 'City name is required');

    const existing = await City.findOne({
      where: {
        id: { [Op.ne]: city.id },
        country_id: city.country_id,
        [Op.and]: sequelize.where(sequelize.fn('lower', sequelize.col('name')), name.toLowerCase()),
      },
    });
    if (existing) throw new ApiError(400, 'City already exists for this country');
  }

  await city.update({
    name: name !== undefined ? name : city.name,
    is_active: typeof is_active === 'boolean' ? is_active : city.is_active,
  });

  res.status(200).json(new ApiResponse(200, { city }, 'City updated'));
});

exports.toggleCityStatus = asyncHandler(async (req, res) => {
  ensureSuperadmin(req);

  const { id } = req.params;
  const city = await City.findByPk(id);
  if (!city) throw new ApiError(404, 'City not found');

  await city.update({ is_active: !city.is_active });
  res.status(200).json(new ApiResponse(200, { city }, 'City status updated'));
});

exports.deleteCity = asyncHandler(async (req, res) => {
  ensureSuperadmin(req);

  const { id } = req.params;
  const city = await City.findByPk(id);
  if (!city) throw new ApiError(404, 'City not found');

  await city.update({ is_active: false });
  res.status(200).json(new ApiResponse(200, null, 'City deleted'));
});
