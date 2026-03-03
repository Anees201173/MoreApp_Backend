const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const City = sequelize.define(
  'cities',
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    country_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    name: {
      type: DataTypes.STRING(100),
      allowNull: false,
      validate: {
        notEmpty: { msg: 'City name is required' },
        len: {
          args: [2, 100],
          msg: 'City name must be between 2 and 100 characters',
        },
      },
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
  },
  {
    tableName: 'cities',
    timestamps: true,
    indexes: [{ unique: true, fields: ['country_id', 'name'] }],
  }
);

module.exports = City;
