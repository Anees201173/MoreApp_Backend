const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const MerchantSubscriptionPlan = sequelize.define(
  'merchant_subscription_plans',
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
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
    subscription_category_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'subscription_categories',
        key: 'id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
    },
    title: {
      type: DataTypes.STRING(150),
      allowNull: false,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    photo_url: {
      type: DataTypes.STRING(500),
      allowNull: true,
    },
    price: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      validate: {
        min: 0,
      },
    },
    duration_days: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: {
        min: 1,
      },
    },
    gift_energy_points: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      validate: {
        min: 0,
      },
    },
    start_date: {
      type: DataTypes.DATEONLY,
      allowNull: true,
    },
    end_date: {
      type: DataTypes.DATEONLY,
      allowNull: true,
    },
    voucher_policy: {
      type: DataTypes.STRING(30),
      allowNull: false,
      defaultValue: 'unlimited',
    },
    max_total_uses: {
      type: DataTypes.INTEGER,
      allowNull: true,
      validate: {
        min: 1,
      },
    },
    max_uses_per_month: {
      type: DataTypes.INTEGER,
      allowNull: true,
      validate: {
        min: 1,
      },
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
  },
  {
    tableName: 'merchant_subscription_plans',
    timestamps: true,
  }
);

module.exports = MerchantSubscriptionPlan;
