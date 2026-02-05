const { Sequelize } = require('sequelize');
const { sequelize } = require('../config/db');

// Import all models
const Field = require('./Field')
const FieldCategory = require('./FieldCategory')
const FieldAvailability = require('./FieldAvailability')
const FieldClosure = require('./FieldClosure')
const FieldBooking = require('./FieldBooking')
const FieldSubscription = require('./FieldSubscription')
const FieldSubscriptionPlan = require('./FieldSubscriptionPlan')
const Addon = require('./Addon')
const User = require('./User')
const Company = require('./Company')
const Merchant = require('./Marchant')
const Category = require('./Category')
const Product = require('./Product')
const Store = require('./Store')
const Cart = require('./Cart')
const CartItem = require('./CartItem')
const Order = require('./Order')
const OrderItem = require('./OrderItem')
const Post = require('./Post')
const PostLike = require('./PostLike')
const PostRepost = require('./PostRepost')



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
  Company.hasMany(User, {
    foreignKey: 'company_id',
    as: 'employees'
  });

  User.belongsTo(Company, {
    foreignKey: 'company_id',
    as: 'company'
  });
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
  //   MERCHANT <-> FIELDS    (One Merchant has Many Fields)
  // =======================================================
  Merchant.hasMany(Field, {
    foreignKey: 'merchant_id',
    as: 'fields',
    onDelete: 'SET NULL',
    onUpdate: 'CASCADE',
  });

  Field.belongsTo(Merchant, {
    foreignKey: 'merchant_id',
    as: 'merchant',
  });

  // =======================================================
  //   FIELD <-> SUBSCRIPTION PLANS (merchant-defined pricing)
  // =======================================================
  Merchant.hasMany(FieldSubscriptionPlan, {
    foreignKey: 'merchant_id',
    as: 'subscriptionPlans',
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  });

  FieldSubscriptionPlan.belongsTo(Merchant, {
    foreignKey: 'merchant_id',
    as: 'merchant',
  });

  Field.hasMany(FieldSubscriptionPlan, {
    foreignKey: 'field_id',
    as: 'subscriptionPlans',
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  });

  FieldSubscriptionPlan.belongsTo(Field, {
    foreignKey: 'field_id',
    as: 'field',
  });

  // =======================================================
  //   FIELD CATEGORY <-> FIELDS
  // =======================================================
  FieldCategory.hasMany(Field, {
    foreignKey: 'field_category_id',
    as: 'fieldsByCategory',
    onDelete: 'SET NULL',
    onUpdate: 'CASCADE',
  });

  Field.belongsTo(FieldCategory, {
    foreignKey: 'field_category_id',
    as: 'fieldCategory',
  });

  // =======================================================
  //   FIELD <-> AVAILABILITIES (weekly opening hours)
  // =======================================================
  Field.hasMany(FieldAvailability, {
    foreignKey: 'field_id',
    as: 'availabilities',
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  });

  FieldAvailability.belongsTo(Field, {
    foreignKey: 'field_id',
    as: 'field',
  });

  // =======================================================
  //   FIELD <-> CLOSURES (specific date closures)
  // =======================================================
  Field.hasMany(FieldClosure, {
    foreignKey: 'field_id',
    as: 'closures',
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  });

  FieldClosure.belongsTo(Field, {
    foreignKey: 'field_id',
    as: 'field',
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

  // =======================================================
  //   COMPANY/USER <-> POSTS
  // =======================================================
  Company.hasMany(Post, {
    foreignKey: 'company_id',
    as: 'posts',
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  });

  Post.belongsTo(Company, {
    foreignKey: 'company_id',
    as: 'company',
  });

  User.hasMany(Post, {
    foreignKey: 'user_id',
    as: 'posts',
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  });

  Post.belongsTo(User, {
    foreignKey: 'user_id',
    as: 'author',
  });

  // =======================================================
  //   POSTS <-> LIKES / REPOSTS
  // =======================================================
  Post.hasMany(PostLike, {
    foreignKey: 'post_id',
    as: 'likes',
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  });

  PostLike.belongsTo(Post, {
    foreignKey: 'post_id',
    as: 'post',
  });

  User.hasMany(PostLike, {
    foreignKey: 'user_id',
    as: 'postLikes',
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  });

  PostLike.belongsTo(User, {
    foreignKey: 'user_id',
    as: 'user',
  });

  Post.hasMany(PostRepost, {
    foreignKey: 'post_id',
    as: 'reposts',
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  });

  PostRepost.belongsTo(Post, {
    foreignKey: 'post_id',
    as: 'post',
  });

  User.hasMany(PostRepost, {
    foreignKey: 'user_id',
    as: 'postReposts',
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  });

  PostRepost.belongsTo(User, {
    foreignKey: 'user_id',
    as: 'user',
  });

  // =======================================================
  //   FIELD <-> BOOKINGS / SUBSCRIPTIONS
  // =======================================================
  Field.hasMany(FieldBooking, {
    foreignKey: 'field_id',
    as: 'bookings',
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  });

  FieldBooking.belongsTo(Field, {
    foreignKey: 'field_id',
    as: 'field',
  });

  User.hasMany(FieldBooking, {
    foreignKey: 'user_id',
    as: 'fieldBookings',
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  });

  FieldBooking.belongsTo(User, {
    foreignKey: 'user_id',
    as: 'user',
  });

  Field.hasMany(FieldSubscription, {
    foreignKey: 'field_id',
    as: 'subscriptions',
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  });

  FieldSubscription.belongsTo(Field, {
    foreignKey: 'field_id',
    as: 'field',
  });

  User.hasMany(FieldSubscription, {
    foreignKey: 'user_id',
    as: 'fieldSubscriptions',
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  });

  FieldSubscription.belongsTo(User, {
    foreignKey: 'user_id',
    as: 'user',
  });

  FieldSubscriptionPlan.hasMany(FieldSubscription, {
    foreignKey: 'plan_id',
    as: 'subscriptions',
    onDelete: 'SET NULL',
    onUpdate: 'CASCADE',
  });

  FieldSubscription.belongsTo(FieldSubscriptionPlan, {
    foreignKey: 'plan_id',
    as: 'plan',
  });

  // =======================================================
  //   FIELD <-> ADDONS
  // =======================================================
  Field.hasMany(Addon, {
    foreignKey: 'field_id',
    as: 'addons',
    onDelete: 'SET NULL',
    onUpdate: 'CASCADE',
  });

  Addon.belongsTo(Field, {
    foreignKey: 'field_id',
    as: 'field',
  });

  // Merchant <-> Addons
  Merchant.hasMany(Addon, {
    foreignKey: 'merchant_id',
    as: 'addons',
    onDelete: 'SET NULL',
    onUpdate: 'CASCADE',
  });

  Addon.belongsTo(Merchant, {
    foreignKey: 'merchant_id',
    as: 'merchant',
  });

  // =======================================================
  //   MERCHANT <-> STORES    (One Merchant has Many Stores)
  // =======================================================
  Merchant.hasMany(Store, {
    foreignKey: 'merchant_id',
    as: 'stores',
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  });

  Store.belongsTo(Merchant, {
    foreignKey: 'merchant_id',
    as: 'merchant',
  });

  // =======================================================
  //   STORE <-> PRODUCTS   (One Store has Many Products)
  // =======================================================
  Store.hasMany(Product, {
    foreignKey: 'store_id',
    as: 'products',
    onDelete: 'SET NULL',
    onUpdate: 'CASCADE',
  });

  Product.belongsTo(Store, {
    foreignKey: 'store_id',
    as: 'store',
  });

  // =======================================================
  //   USER <-> CARTS / CART ITEMS
  // =======================================================
  User.hasMany(Cart, {
    foreignKey: 'user_id',
    as: 'carts',
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  });

  Cart.belongsTo(User, {
    foreignKey: 'user_id',
    as: 'user',
  });

  Cart.hasMany(CartItem, {
    foreignKey: 'cart_id',
    as: 'items',
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  });

  CartItem.belongsTo(Cart, {
    foreignKey: 'cart_id',
    as: 'cart',
  });

  Product.hasMany(CartItem, {
    foreignKey: 'product_id',
    as: 'cartItems',
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  });

  CartItem.belongsTo(Product, {
    foreignKey: 'product_id',
    as: 'product',
  });

  // =======================================================
  //   USER/MERCHANT/STORE <-> ORDERS / ORDER ITEMS
  // =======================================================
  User.hasMany(Order, {
    foreignKey: 'user_id',
    as: 'orders',
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  });

  Order.belongsTo(User, {
    foreignKey: 'user_id',
    as: 'user',
  });

  Merchant.hasMany(Order, {
    foreignKey: 'merchant_id',
    as: 'orders',
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  });

  Order.belongsTo(Merchant, {
    foreignKey: 'merchant_id',
    as: 'merchant',
  });

  Store.hasMany(Order, {
    foreignKey: 'store_id',
    as: 'orders',
    onDelete: 'SET NULL',
    onUpdate: 'CASCADE',
  });

  Order.belongsTo(Store, {
    foreignKey: 'store_id',
    as: 'store',
  });

  Order.hasMany(OrderItem, {
    foreignKey: 'order_id',
    as: 'items',
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  });

  OrderItem.belongsTo(Order, {
    foreignKey: 'order_id',
    as: 'order',
  });

  Product.hasMany(OrderItem, {
    foreignKey: 'product_id',
    as: 'orderItems',
    onDelete: 'SET NULL',
    onUpdate: 'CASCADE',
  });

  OrderItem.belongsTo(Product, {
    foreignKey: 'product_id',
    as: 'product',
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
  Product,
  Post,
  PostLike,
  PostRepost,
  Field,
  FieldCategory,
  FieldAvailability,
  FieldClosure,
  FieldBooking,
  FieldSubscription,
  FieldSubscriptionPlan,
  Addon,
  Store,
  Cart,
  CartItem,
  Order,
  OrderItem,
};
