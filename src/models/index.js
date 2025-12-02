const { Sequelize } = require('sequelize');
const { sequelize } = require('../config/db');

// Import all models
const User = require('./User')
const Company = require('./Company')


// Define model associations
const defineAssociations = () => {
  // Example associations (uncomment and modify as needed)
  // User.hasMany(Post, { foreignKey: 'user_id', as: 'posts' });
  // Post.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

  // One Company has One Admin (User)
  Company.hasOne(User, {
    foreignKey: 'company_id',
    as: 'companyadmin',
    onDelete: 'SET NULL',
    onUpdate: 'CASCADE'
  });

  // User belongs to Company
  User.belongsTo(Company, {
    foreignKey: 'company_id',
    as: 'company'
  });
}


// Initialize associations
defineAssociations();

// Export all models and sequelize instance
module.exports = {
  sequelize,
  Sequelize,
  User,
  Company

  // Add other models here as you create them
}