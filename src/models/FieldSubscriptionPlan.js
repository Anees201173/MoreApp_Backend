const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const FieldSubscriptionPlan = sequelize.define(
  'field_subscription_plans',
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    field_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'fields',
        key: 'id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE',
    },
    merchant_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'merchants',
        key: 'id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE',
    },
    title: {
      type: DataTypes.STRING(150),
      allowNull: false,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    type: {
      type: DataTypes.ENUM('monthly', 'quarterly', 'yearly'),
      allowNull: false,
    },
    price: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
    },
    currency: {
      type: DataTypes.STRING(10),
      allowNull: false,
      defaultValue: 'SAR',
    },
    features: {
      type: DataTypes.JSONB,
      allowNull: true,
      defaultValue: [],
    },
    visibility: {
      type: DataTypes.ENUM('public', 'private'),
      allowNull: false,
      defaultValue: 'public',
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
  },
  {
    tableName: 'field_subscription_plans',
    timestamps: true,
  }
);

module.exports = FieldSubscriptionPlan;
