const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/db");
const Merchant = require("./Marchant");

const Field = sequelize.define(
  "fields",
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

    address: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },

    city: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },

    latitude: {
      type: DataTypes.DOUBLE,
      allowNull: true,
    },

    longitude: {
      type: DataTypes.DOUBLE,
      allowNull: true,
    },

    sports: {
      type: DataTypes.ARRAY(DataTypes.STRING),
      allowNull: true,
      defaultValue: [],
    },

    images: {
      type: DataTypes.ARRAY(DataTypes.STRING),
      allowNull: true,
      defaultValue: [],
    },

    price_per_hour: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
    },

    field_category_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'field_categories',
        key: 'id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
    },

    status: {
      type: DataTypes.ENUM("active", "disabled"),
      allowNull: false,
      defaultValue: "active",
    },

    merchant_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: Merchant,
        key: "id",
      },
      onUpdate: "CASCADE",
      onDelete: "SET NULL",
    },
  },
  {
    tableName: "fields",
    timestamps: true,
  }
);

module.exports = Field;
