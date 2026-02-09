const { DataTypes, STRING } = require("sequelize");
const { sequelize } = require("../config/db");
const bcrypt = require("bcryptjs");
const { types } = require("pg");

const User = sequelize.define(
  "users",
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
        notEmpty: { msg: "name is required" },
        len: {
          args: [2, 50],
          msg: "First name must be between 2 and 50 characters",
        },
      },
    },
    username: {
      type: DataTypes.STRING(50),
      allowNull: false,
      validate: {
        notEmpty: { msg: "Last name is required" },
        len: {
          args: [2, 50],
          msg: "username must be between 2 and 50 characters",
        },
      },
    },
    email: {
      type: DataTypes.STRING(100),
      allowNull: false,
      unique: { msg: "Email address already exists" },
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

    gender: {
      type: DataTypes.ENUM("male", "female"),
      allowNull: false,
      defaultValue: "male",
      validate: {
        isIn: {
          args: [["male", "female"]],
          msg: "Gender must be either male or female",
        },
      },
    },

    energy_points_balance: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
      defaultValue: 0,
    },

    city: {
      type: DataTypes.STRING(100),
      allowNull: true,
      validate: {
        len: {
          args: [2, 100],
          msg: "City must be between 2 and 100 characters",
        },
      },
    },

    country: {
      type: DataTypes.STRING(100),
      allowNull: true,
      validate: {
        len: {
          args: [2, 100],
          msg: "Country must be between 2 and 100 characters",
        },
      },
    },

    role: {
      type: DataTypes.ENUM("superadmin", "companyadmin", "merchant", "user"),
      defaultValue: "user",
      allowNull: false,
    },
    company_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: "companies",
        key: "id",
      },
      onDelete: "SET NULL",
      onUpdate: "CASCADE",
    },

    is_active: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      allowNull: false,
    },
    email_verified: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      allowNull: false,
    },

    otp: {
      type: DataTypes.STRING(50),
      allowNull: true,
    },
    otp_expires: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    otpType: {
      type: DataTypes.ENUM("register", "login", "reset"),
      allowNull: true,
    },
    last_login: {
      type: DataTypes.DATE,
      allowNull: true,
    },
  },
  {
    tableName: "users",
    hooks: {
      beforeCreate: async (user) => {
        if (user.password) {
          const salt = await bcrypt.genSalt(12);
          user.password = await bcrypt.hash(user.password, salt);
        }
      },
      beforeUpdate: async (user) => {
        if (user.changed("password")) {
          const salt = await bcrypt.genSalt(12);
          user.password = await bcrypt.hash(user.password, salt);
        }
      },
    },
  },
);

// Instance methods
User.prototype.validatePassword = async function (password) {
  return await bcrypt.compare(password, this.password);
};

// User.prototype.getFullName = function () {
//   return `${this.first_name} ${this.last_name}`;
// };

User.prototype.toJSON = function () {
  const values = Object.assign({}, this.get());
  delete values.password;
  return values;
};

// Class methods
User.findByEmail = function (email) {
  return this.findOne({ where: { email } });
};

User.findActiveUsers = function () {
  return this.findAll({ where: { is_active: true } });
};

User.findByUserName = function (username) {
  return this.findOne({ where: { username } });
};

module.exports = User;
