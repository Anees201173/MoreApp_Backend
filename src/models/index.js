const { Sequelize } = require('sequelize');
const { sequelize } = require('../config/db');

// Import all models
const User = require('./User')
const Company = require('./Company')
const Marchant = require('./Marchant')
const Category = require('./Category')
const Product = require('./Product')



// Define model associations
const defineAssociations = () => {

  // ============ User <--> Company ============//
  // ==========================================//
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
  // ============== User <--> Marchant ======= //
  // ========================================= //
  // Merchant <-> User (1 to 1)
  User.hasOne(Marchant, {
    foreignKey: 'user_id',
    as: 'marchantadmin'
  });

  Marchant.belongsTo(User, {
    foreignKey: 'user_id',
    as: 'user'
  });

  // =======================================================
  //   CATEGORY <-> PRODUCTS   (One Category has Many Products)
  // =======================================================
  Category.hasMany(Product, {
    foreignKey: 'category_id',
    as: 'products',
    onDelete: 'SET NULL',
    onUpdate: 'CASCADE'
  });

  Product.belongsTo(Category, {
    foreignKey: 'category_id',
    as: 'category'
  });


  // =======================================================
  //   USER <-> PRODUCTS    (One User has Many Products)
  // =======================================================
  User.hasMany(Product, {
    foreignKey: 'user_id',
    as: 'userProducts',
    onDelete: 'SET NULL',
    onUpdate: 'CASCADE'
  });

  Product.belongsTo(User, {
    foreignKey: 'user_id',
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
  Company,
  Marchant,
  Category,
  Product

  // Add other models here as you create them
}