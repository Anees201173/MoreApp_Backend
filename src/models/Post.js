const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/db");
const Company = require("./Company");
const User = require("./User");

const Post = sequelize.define(
  "posts",
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },

    title: {
      type: DataTypes.STRING(150),
      allowNull: true,
    },

    content: {
      type: DataTypes.TEXT,
      allowNull: false,
    },

    media_urls: {
      type: DataTypes.ARRAY(DataTypes.STRING),
      allowNull: true,
      defaultValue: [],
    },

    status: {
      type: DataTypes.ENUM("draft", "scheduled", "published", "cancelled"),
      allowNull: false,
      defaultValue: "published",
    },

    scheduled_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },

    company_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: Company,
        key: "id",
      },
      onUpdate: "CASCADE",
      onDelete: "CASCADE",
    },

    user_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: User,
        key: "id",
      },
      onUpdate: "CASCADE",
      onDelete: "CASCADE",
    },
  },
  {
    tableName: "posts",
    timestamps: true,
  }
);

module.exports = Post;
