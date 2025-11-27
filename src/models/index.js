const { Sequelize } = require('sequelize');
const { sequelize } = require('../config/db');

// Import all models
const User = require('./User')


// Define model associations
const defineAssociations = () => {
  // Example associations (uncomment and modify as needed)
  // User.hasMany(Post, { foreignKey: 'user_id', as: 'posts' });
  // Post.belongsTo(User, { foreignKey: 'user_id', as: 'user' });


};

// Initialize associations
defineAssociations();

// Export all models and sequelize instance
module.exports = {
  sequelize,
  Sequelize,
  User

  // Add other models here as you create them
};