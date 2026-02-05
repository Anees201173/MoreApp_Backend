const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const FieldClosure = sequelize.define(
  'field_closures',
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    field_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'fields',
        key: 'id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE',
    },
    // YYYY-MM-DD (date-only closure)
    date: {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },
    reason: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
  },
  {
    tableName: 'field_closures',
    timestamps: true,
  }
);

module.exports = FieldClosure;
