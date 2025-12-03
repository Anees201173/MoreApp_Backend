'use strict';
const bcrypt = require('bcryptjs');

module.exports = {
  async up(queryInterface, Sequelize) {
    const salt = await bcrypt.genSalt(12);
    const hashedPassword = await bcrypt.hash('company123', salt);

    await queryInterface.bulkInsert('companies', [
      {
        name: 'Alpha Corp',
        // admin_id: 1,
        email: 'alpha@example.com',
        password: hashedPassword,
        address: '123 Main St, City, Country',
        // uploads: [], // <-- actual array
        phone: '1234567890',
        is_active: true,
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        name: 'Beta Ltd',
        // admin_id: 2,
        email: 'beta@example.com',
        password: hashedPassword,
        address: '456 Second St, City, Country',
        // uploads: [], // <-- actual array
        phone: '0987654321',
        is_active: true,
        created_at: new Date(),
        updated_at: new Date()
      }
    ]);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete('companies', {
      email: ['alpha@example.com', 'beta@example.com']
    });
  }
};
