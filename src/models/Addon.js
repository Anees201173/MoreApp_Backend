const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');
const Merchant = require('./Marchant');
const Field = require('./Field');

const Addon = sequelize.define(
  'addons',
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    title: {
      type: DataTypes.STRING(150),
      allowNull: false,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    price: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
    },
    image: {
      type: DataTypes.STRING(1024),
      allowNull: true,
    },
    field_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: Field,
        key: 'id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
    },
    merchant_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: Merchant,
        key: 'id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
    },
    status: {
      type: DataTypes.ENUM('active','disabled'),
      allowNull: false,
      defaultValue: 'active',
    }
  },
  {
    tableName: 'addons',
    timestamps: true,
  }
);

module.exports = Addon;
