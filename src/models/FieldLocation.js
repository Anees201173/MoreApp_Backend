const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const FieldLocation = sequelize.define(
  'field_locations',
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    field_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    country: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
    city: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
    location_url: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
  },
  {
    tableName: 'field_locations',
    timestamps: true,
  }
);

module.exports = FieldLocation;
