const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const EmployeeDeleteVerification = sequelize.define(
  'employee_delete_verifications',
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    company_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    company_admin_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    employee_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    code_hash: {
      type: DataTypes.STRING(128),
      allowNull: false,
    },
    expires_at: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    attempts: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    verified_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    delete_token_hash: {
      type: DataTypes.STRING(128),
      allowNull: true,
    },
    delete_token_expires_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    consumed_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
  },
  {
    tableName: 'employee_delete_verifications',
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  },
);

module.exports = EmployeeDeleteVerification;
