'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.bulkInsert('products', [
      {
        name: 'Nike Running Shoes',
        description: 'Lightweight shoes for daily running.',
        price: 89.99,
        quantity: 150,
        size: 'M',
        color: 'Black',
        uploads: ['nike-shoe.jpg'],
        energyPoints: 20,
        category_id: 2,
        createdAt: new Date(),
        updatedAt: new Date()
      },

      {
        name: 'Apple iPhone 14',
        description: 'Latest iPhone model with A16 chip.',
        price: 999.99,
        quantity: 50,
        size: null,
        color: 'Blue',
        uploads: ['iphone14.jpg'],
        energyPoints: 100,
        category_id: 3,
        createdAt: new Date(),
        updatedAt: new Date()
      },

      {
        name: 'Slim Fit T-Shirt',
        description: 'Soft cotton premium slim fit t-shirt.',
        price: 19.99,
        quantity: 300,
        size: 'L',
        color: 'White',
        uploads: ['tshirt-white.jpg'],
        energyPoints: 10,
        category_id: 1,
        createdAt: new Date(),
        updatedAt: new Date()
      },
    ]);
  },



  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete('products', null, {})
  }
};
