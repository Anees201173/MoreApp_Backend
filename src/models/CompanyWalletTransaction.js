const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const CompanyWalletTransaction = sequelize.define(
  'company_wallet_transaction',
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
    created_by_user_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    type: {
      type: DataTypes.ENUM('deposit', 'withdraw'),
      allowNull: false,
    },
    status: {
      type: DataTypes.ENUM('approved', 'pending', 'rejected'),
      allowNull: false,
      defaultValue: 'approved',
    },
    amount: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
    },
    energy_points: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: true,
    },
    description: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
  },
  {
    tableName: 'company_wallet_transactions',
  }
);

module.exports = CompanyWalletTransaction;
