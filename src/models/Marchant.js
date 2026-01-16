const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/db");
const bcrypt = require("bcryptjs");
const User = require("./User");

const Merchant = sequelize.define(
  "Merchant",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    name: {
      type: DataTypes.STRING(50),
      allowNull: false,
      validate: {
        notEmpty: { msg: "Merchant name is required" },
        len: { args: [2, 50], msg: "name must be between 2 and 50 characters" },
      },
    },
    phone: {
      type: DataTypes.STRING(20),
      allowNull: true,
      validate: {
        len: {
          args: [10, 20],
          msg: "Phone number must be between 10 and 20 characters",
        },
      },
    },
    email: {
      type: DataTypes.STRING(100),
      allowNull: false,
      unique: { msg: "Merchant Email address already exists" },
      validate: {
        notEmpty: { msg: "Email is required" },
        isEmail: { msg: "Must be a valid email address" },
      },
    },
    password: {
      type: DataTypes.STRING(255),
      allowNull: false,
      validate: {
        notEmpty: { msg: "Password is required" },
        len: {
          args: [6, 255],
          msg: "Password must be at least 6 characters long",
        },
      },
    },
    address: {
      type: DataTypes.STRING(255),
      allowNull: false,
      validate: {
        notEmpty: { msg: "Address is required " },
        len: {
          args: [5, 255],
          msg: "Address must be at least 5 characters long",
        },
      },
    },
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: User,
        key: "id",
      },
      onUpdate: "CASCADE",
      onDelete: "RESTRICT",
    },
    uploads: {
      type: DataTypes.ARRAY(DataTypes.STRING),
      allowNull: true,
      defaultValue: [], // Optional: default empty array
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      allowNull: false,
    },
  },
  {
    tableName: "merchants",
    hooks: {
      beforeCreate: async (company) => {
        if (company.password) {
          const salt = await bcrypt.genSalt(12);
          company.password = await bcrypt.hash(company.password, salt);
        }
      },
      beforeUpdate: async (company) => {
        if (company.changed("password")) {
          const salt = await bcrypt.genSalt(12);
          company.password = await bcrypt.hash(company.password, salt);
        }
      },
    },
  }
);

// <===========  Instance methods ==========> //
// ========================================== //

Merchant.prototype.validatePassword = async function (password) {
  return await bcrypt.compare(password, this.password);
};

Merchant.prototype.toJSON = function () {
  const values = Object.assign({}, this.get());
  delete values.password;
  return values;
};

Merchant.findByEmail = function (email) {
  return this.findOne({ where: { email } });
};

Merchant.findByMerchantAdmin = function (companyAdmin) {
  return this.findOne({ where: { companyAdmin } });
};

Merchant.findActiveMerchants = function () {
  return this.findAll({ where: { is_active: true } });
};

module.exports = Merchant;
