const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const MerchantSubscriptionRedemption = sequelize.define(
  'merchant_subscription_redemptions',
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    subscription_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'merchant_subscriptions',
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
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE',
    },
    redeemed_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    tableName: 'merchant_subscription_redemptions',
    timestamps: true,
  }
);

module.exports = MerchantSubscriptionRedemption;
