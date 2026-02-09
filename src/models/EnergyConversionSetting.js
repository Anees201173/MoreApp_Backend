const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const EnergyConversionSetting = sequelize.define(
  'energy_conversion_setting',
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    points_per_sar: {
      type: DataTypes.DECIMAL(12, 4),
      allowNull: false,
      defaultValue: 1,
    },
    created_by_user_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    updated_by_user_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
  },
  {
    tableName: 'energy_conversion_settings',
  }
);

module.exports = EnergyConversionSetting;
