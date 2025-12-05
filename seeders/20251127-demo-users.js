'use strict';
const bcrypt = require('bcryptjs');

module.exports = {
  async up(queryInterface) {
    const salt = await bcrypt.genSalt(12);
    
    const password = await bcrypt.hash('password123', salt);

    await queryInterface.bulkInsert('users', [
      {
        name: 'Super Admin',
        username: 'superadmin',
        email: 'superadmin@example.com',
        password,
        phone: '1111111111',
        gender: 'male',
        city: 'HQ',
        country: 'Unknown',
        role: 'superadmin',
        is_active: true,
        email_verified: true,
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        name: 'Company Admin',
        username: 'companyadmin',
        email: 'companyadmin@example.com',
        password,
        phone: '2222222222',
        gender: 'female',
        city: 'Business City',
        country: 'USA',
        role: 'companyadmin',
        is_active: true,
        email_verified: true,
        // company_id: null, // Update later if you have company seeded
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        name: 'Merchant User',
        username: 'merchant1',
        email: 'merchant1@example.com',
        password,
        phone: '3333333333',
        gender: 'male',
        city: 'Trade Town',
        country: 'USA',
        role: 'merchant',
        is_active: true,
        email_verified: false,
        // company_id: null,
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        name: 'Regular User',
        username: 'user1',
        email: 'user1@example.com',
        password,
        phone: '4444444444',
        gender: 'female',
        city: 'User City',
        country: 'Canada',
        role: 'user',
        is_active: true,
        email_verified: false,
        created_at: new Date(),
        updated_at: new Date()
      },
    ]);
  },

  async down(queryInterface) {
    await queryInterface.bulkDelete('users', {
      email: [
        'superadmin@example.com',
        'companyadmin@example.com',
        'merchant1@example.com',
        'user1@example.com'
      ]
    });
  }
};
