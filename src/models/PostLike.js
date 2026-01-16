const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');
const Post = require('./Post');
const User = require('./User');

const PostLike = sequelize.define(
  'post_likes',
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    post_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: Post,
        key: 'id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE',
    },
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: User,
        key: 'id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE',
    },
  },
  {
    tableName: 'post_likes',
    timestamps: true,
    indexes: [
      {
        unique: true,
        fields: ['post_id', 'user_id'],
      },
    ],
  }
);

module.exports = PostLike;
