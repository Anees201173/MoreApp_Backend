'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.bulkInsert('categories', [
      {
        name: 'T-Shirts',
        description: 'Casual and trendy t-shirts for men and women.',
        status: true,
        // admin_id: 1,
        uploads: ['tshirts.jpg'],
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        name: 'Shoes',
        description: 'Running shoes, sneakers, boots, and formal shoes.',
        status: true,
        // admin_id: 1,
        uploads: ['shoes.jpg'],
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        name: 'Electronics',
        description: 'Latest gadgets, mobiles, laptops, and accessories.',
        status: true,
        // admin_id: 1,
        uploads: ['electronics.jpg'],
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        name: 'Watches',
        description: 'Digital and analog watches for men and women.',
        status: true,
        // admin_id: 1,
        uploads: ['watches.jpg'],
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        name: 'Bags',
        description: 'Backpacks, handbags, travel bags and more.',
        status: true,
        // admin_id: 1,
        uploads: ['bags.jpg'],
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        name: 'Accessories',
        description: 'Belts, wallets, caps, sunglasses, and more.',
        status: true,
        // admin_id: 1,
        uploads: ['accessories.jpg'],
        created_at: new Date(),
        updated_at: new Date()
      }
    ]);
  },

  async down(queryInterface) {
    await queryInterface.bulkDelete('categories', null, {});
  }
};
