const { Sequelize } = require('sequelize');
const { sequelize } = require('../config/db');

// Import all models
const User = require('./User')
const Company = require('./Company')
const Merchant = require('./Marchant')
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
  // ============== User <--> Merchant ======= //
  // ========================================= //
  // Merchant <-> User (1 to 1)
  User.hasOne(Merchant, {
    foreignKey: 'user_id',
    as: 'merchantProfile',
    onDelete: 'RESTRICT',
    onUpdate: 'CASCADE'
  });

  Merchant.belongsTo(User, {
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
  //   MERCHANT <-> PRODUCTS    (One Merchant has Many Products)
  // =======================================================
  Merchant.hasMany(Product, {
    foreignKey: 'merchant_id',
    as: 'products',
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE'
  });

  Product.belongsTo(Merchant, {
    foreignKey: 'merchant_id',
    as: 'merchant'
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
  Merchant,
  Category,
  Product

  // Add other models here as you create them
}