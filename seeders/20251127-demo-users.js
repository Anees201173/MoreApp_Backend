'use strict';
const bcrypt = require('bcryptjs');

module.exports = {
  async up(queryInterface) {
    const salt = await bcrypt.genSalt(12);
    const hash = await bcrypt.hash('password123', salt);

    await queryInterface.bulkInsert('users', [
      {
        name: 'Admin',
        username: 'User',
        email: 'admin@example.com',
        password: hash,
        phone: '1234567890',
        gender: 'male',
        city: 'Unknown',
        country: 'Unknown',
        role: 'user',
        is_active: true,
        email_verified: true,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ]);
  },

  async down(queryInterface) {
    await queryInterface.bulkDelete('users', { email: 'admin@example.com' });
  }
};
