const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/db");
const Category = require("./Category");
const User = require("./User");
const Merchant = require("./Marchant");
const Store = require("./Store");

const Product = sequelize.define(
  "products",
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    

    title: {
      type: DataTypes.STRING(150),
      allowNull: false,
      validate: {
        notEmpty: { msg: "Product title is required" },
        len: {
          args: [2, 150],
          msg: "Title must be between 2 and 150 characters",
        },
      },
    },

    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },

    price: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      validate: {
        min: 0,
      },
    },

    discount_percentage: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: 0,
      validate: {
        min: 0,
        max: 100,
      },
    },

    quantity: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      validate: {
        isInt: true,
        min: 0,
      },
    },

    size: {
      type: DataTypes.STRING(50),
      allowNull: true,
    },

    color: {
      type: DataTypes.STRING(50),
      allowNull: true,
    },

    images: {
      type: DataTypes.ARRAY(DataTypes.STRING),
      allowNull: true,
      defaultValue: [],
    },

    brand: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },

    gender: {
      type: DataTypes.ENUM("men", "women", "unisex", "kids"),
      allowNull: true,
      defaultValue: "unisex",
    },

    is_featured: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },

    status: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },

    merchant_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: Merchant,
        key: "id",
      },
      onUpdate: "CASCADE",
      onDelete: "CASCADE",
    },

    store_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: Store,
        key: "id",
      },
      onUpdate: "CASCADE",
      onDelete: "SET NULL",
    },

    category_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: Category,
        key: "id",
      },
      onUpdate: "CASCADE",
      onDelete: "SET NULL",
    },
  },
  {
    tableName: "products",
    timestamps: true,
  }
);

module.exports = Product;
