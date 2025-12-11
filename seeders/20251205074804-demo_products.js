'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.bulkInsert('products', [
      {
        title: 'Nike Running Shoes',
        description: 'Lightweight shoes for daily running.',
        price: 89.99,
        quantity: 150,
        size: 'M',
        color: 'Black',
        images: ['nike-shoe.jpg'],
        // energy_points: 20,
        merchant_id: 2,
        category_id: 2,
        created_at: new Date(),
        updated_at: new Date()
      },

      {
        title: 'Apple iPhone 14',
        description: 'Latest iPhone model with A16 chip.',
        price: 999.99,
        quantity: 50,
        size: null,
        color: 'Blue',
        images: ['iphone14.jpg'],
        // energy_points: 100,
        merchant_id: 2,
        category_id: 3,
        created_at: new Date(),
        updated_at: new Date()
      },

      {
        title: 'Slim Fit T-Shirt',
        description: 'Soft cotton premium slim fit t-shirt.',
        price: 19.99,
        quantity: 300,
        size: 'L',
        color: 'White',
        images: ['tshirt-white.jpg'],
        // energy_points: 10,
        merchant_id: 2,
        category_id: 1,
        created_at: new Date(),
        updated_at: new Date()
      },
    ]);
  },



  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete('products', null, {})
  }
};
