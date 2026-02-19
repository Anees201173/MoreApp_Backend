const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const ProductWishlist = sequelize.define(
  'product_wishlists',
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    product_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
  },
  {
    tableName: 'product_wishlists',
    timestamps: true,
    indexes: [
      {
        unique: true,
        fields: ['user_id', 'product_id'],
      },
    ],
  }
);

module.exports = ProductWishlist;
