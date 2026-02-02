'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addIndex('fields', ['city'], {
      name: 'idx_fields_city',
    });

    await queryInterface.addIndex('fields', ['field_category_id'], {
      name: 'idx_fields_field_category_id',
    });

    await queryInterface.addIndex('fields', ['price_per_hour'], {
      name: 'idx_fields_price_per_hour',
    });

    // Helpful composite index for common filter combos
    await queryInterface.addIndex('fields', ['city', 'field_category_id', 'price_per_hour'], {
      name: 'idx_fields_city_category_price',
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeIndex('fields', 'idx_fields_city_category_price');
    await queryInterface.removeIndex('fields', 'idx_fields_price_per_hour');
    await queryInterface.removeIndex('fields', 'idx_fields_field_category_id');
    await queryInterface.removeIndex('fields', 'idx_fields_city');
  },
};
