const { Sequelize } = require('sequelize');
const { sequelize } = require('../config/db');

// Import all models
const User = require('./User')
const Company = require('./Company')
const Marchant = require('./Marchant')


// Define model associations
const defineAssociations = () => {
  // Company Admin (ONE User → ONE Company)
  User.hasOne(Company, {
    foreignKey: 'admin_id',
    as: 'adminOfCompany',
    onDelete: 'RESTRICT',
    onUpdate: 'CASCADE'
  });

  Company.belongsTo(User, {
    foreignKey: 'admin_id',
    as: 'admin'
  });

  // Company Employees (Company has many Users)
  // Company.hasMany(User, {
  //   foreignKey: 'company_id',
  //   as: 'employees'
  // });

  // User.belongsTo(Company, {
  //   foreignKey: 'company_id',
  //   as: 'company'
  // });

  // Merchant <-> User (1 to 1)
  User.hasOne(Marchant, {
    foreignKey: 'user_id',
    as: 'merchant_admin'
  });

  Marchant.belongsTo(User, {
    foreignKey: 'marchantadmin',
    as: 'user'
  });
};



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