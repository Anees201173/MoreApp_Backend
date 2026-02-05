const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const Order = sequelize.define(
  'orders',
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
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
    store_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'stores',
        key: 'id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
    },
    status: {
      type: DataTypes.ENUM('pending', 'paid', 'cancelled', 'completed'),
      allowNull: false,
      defaultValue: 'pending',
    },
    currency: {
      type: DataTypes.STRING(10),
      allowNull: false,
      defaultValue: 'SAR',
    },
    subtotal: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0,
    },
    total: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0,
    },
  },
  {
    tableName: 'orders',
    timestamps: true,
  }
);

module.exports = Order;
