const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const FieldCategory = sequelize.define(
  'field_categories',
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    name: {
      type: DataTypes.STRING(50),
      allowNull: false,
      unique: true,
      validate: {
        notEmpty: { msg: 'Field category name is required' },
        len: {
          args: [2, 50],
          msg: 'Field category name must be between 2 and 50 characters',
        },
      },
    },
    description: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    icon_url: {
      type: DataTypes.STRING,
      allowNull: true,
      validate: {
        isUrl: { msg: 'Icon URL must be a valid URL' },
      },
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
  },
  {
    tableName: 'field_categories',
    timestamps: false,
  }
);

FieldCategory.findByName = function (name) {
  return this.findOne({ where: { name } });
};

FieldCategory.findActive = function () {
  return this.findAll({ where: { is_active: true } });
};

module.exports = FieldCategory;
