'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.bulkInsert('merchants', [
      {
        name: 'SuperShop',
        phone: '1234567890',
        email: 'supershop@example.com',
        password: '$2a$12$EXAMPLEHASHEDPASSWORD', // use hashed passwords
        address: '123 Main Street',
        // admin_id: 1, // Make sure this user exists
        uploads: ['image1.jpg', 'image2.jpg'],
        is_active: true,
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        name: 'MegaStore',
        phone: '0987654321',
        email: 'megastore@example.com',
        password: '$2a$12$EXAMPLEHASHEDPASSWORD', // use hashed passwords
        address: '456 Market Road',
        // admin_id: 2,
        uploads: ['shop1.jpg'],
        is_active: true,
        created_at: new Date(),
        updated_at: new Date()
      }
    ], {});
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete('merchants', null, {});
  }
};
