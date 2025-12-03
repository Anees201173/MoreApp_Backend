const { Company, User } = require('../models');
const { Op } = require('sequelize');
const { validationResult } = require('express-validator');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const ApiResponse = require('../utils/ApiResponse');
const { getPagination, getPagingData } = require('../utils/pagination');
const { sanitizeObject } = require('../utils/helpers');

// Helper to sanitize company data
const sanitizeCompany = (company) =>
  sanitizeObject(company.toJSON(), ['password']);

// @desc    Create new company
// @route   POST /api/v1/company
// @access  Private (Admin)
const createCompany = asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new ApiError(400, 'Validation failed', errors.array());
  }

  const { name, email, password, confirm_password, phone, address } = req.body;

  if (password !== confirm_password) {
    throw new ApiError(400, 'Password and confirm password must match');
  }

  const existingEmail = await Company.findByEmail(email);
  if (existingEmail) {
    throw new ApiError(400, 'Company email already exists');
  }

  const company = await Company.create({ name, email, password, phone, address });

  res.status(201).json(new ApiResponse(201, { company: sanitizeCompany(company) }, 'Company created successfully'));
});

// @desc    Get all companies
// @route   GET /api/v1/company
// @access  Private (Admin)
const getAllCompanies = asyncHandler(async (req, res) => {
  const { page, size, search, is_active } = req.query;
  const { limit, offset } = getPagination(page, size);

  const whereClause = {};
  if (search) {
    whereClause[Op.or] = [
      { name: { [Op.iLike]: `%${search}%` } },
      { email: { [Op.iLike]: `%${search}%` } }
    ];
  }

  if (is_active !== undefined) {
    whereClause.is_active = is_active === 'true';
  }

  const data = await Company.findAndCountAll({
    where: whereClause,
    limit,
    offset,
    order: [['id', 'DESC']],
    include: [{ model: User, as: 'admin', attributes: ['id', 'name', 'email'] }],
    attributes: { exclude: ['password'] }
  });

  const result = getPagingData(data, page, limit);

  res.status(200).json(new ApiResponse(200, result, 'Companies retrieved successfully'));
});

// @desc    Get company by ID
// @route   GET /api/v1/company/:id
// @access  Private
const getCompanyById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const company = await Company.findByPk(id, {
    include: [{ model: User, as: 'admin', attributes: ['id', 'name', 'email'] }],
    attributes: { exclude: ['password'] }
  });

  if (!company) throw new ApiError(404, 'Company not found');

  res.status(200).json(new ApiResponse(200, { company: sanitizeCompany(company) }, 'Company retrieved successfully'));
});

// @desc    Update company
// @route   PUT /api/v1/company/:id
// @access  Private (Admin or company admin)
const updateCompany = asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new ApiError(400, 'Validation failed', errors.array());
  }

  const { id } = req.params;
  const { name, phone, address } = req.body;

  const company = await Company.findByPk(id);
  if (!company) throw new ApiError(404, 'Company not found');

  if (req.user.role !== 'superadmin' && req.user.id !== company.admin_id) {
    throw new ApiError(403, 'Not authorized to update this company');
  }

  const updateData = { name, phone, address };
  await company.update(updateData);

  res.status(200).json(new ApiResponse(200, { company: sanitizeCompany(company) }, 'Company updated successfully'));
});

// @desc    Delete company
// @route   DELETE /api/v1/company/:id
// @access  Private (Admin)
const deleteCompany = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const company = await Company.findByPk(id);
  if (!company) throw new ApiError(404, 'Company not found');

  await company.destroy();

  res.status(200).json(new ApiResponse(200, null, 'Company deleted successfully'));
});

// @desc    Toggle company active status
// @route   PATCH /api/v1/company/:id/toggle-status
// @access  Private (Admin)
const toggleCompanyStatus = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const company = await Company.findByPk(id);
  if (!company) throw new ApiError(404, 'Company not found');

  await company.update({ is_active: !company.is_active });

  res.status(200).json(new ApiResponse(
    200,
    { company: sanitizeCompany(company) },
    `Company status set to ${company.is_active ? 'active' : 'inactive'} successfully`
  ));
});

module.exports = {
  createCompany,
  getAllCompanies,
  getCompanyById,
  updateCompany,
  deleteCompany,
  toggleCompanyStatus
};
