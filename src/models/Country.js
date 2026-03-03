const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const Country = sequelize.define(
  'countries',
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    name: {
      type: DataTypes.STRING(100),
      allowNull: false,
      unique: true,
      validate: {
        notEmpty: { msg: 'Country name is required' },
        len: {
          args: [2, 100],
          msg: 'Country name must be between 2 and 100 characters',
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
    tableName: 'countries',
    timestamps: true,
  }
);

module.exports = Country;
