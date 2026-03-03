const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const SubscriptionCategory = sequelize.define(
  'subscription_categories',
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    name: {
      type: DataTypes.STRING(80),
      allowNull: false,
      unique: true,
      validate: {
        notEmpty: { msg: 'Subscription category name is required' },
        len: {
          args: [2, 80],
          msg: 'Subscription category name must be between 2 and 80 characters',
        },
      },
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
    tableName: 'subscription_categories',
    timestamps: false,
  }
);

SubscriptionCategory.findByName = function (name) {
  return this.findOne({ where: { name } });
};

SubscriptionCategory.findActive = function () {
  return this.findAll({ where: { is_active: true } });
};

module.exports = SubscriptionCategory;
