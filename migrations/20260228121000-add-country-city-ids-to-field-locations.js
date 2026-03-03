'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('field_locations', 'country_id', {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: { model: 'countries', key: 'id' },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
    });

    await queryInterface.addColumn('field_locations', 'city_id', {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: { model: 'cities', key: 'id' },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
    });

    await queryInterface.addIndex('field_locations', ['country_id']);
    await queryInterface.addIndex('field_locations', ['city_id']);
  },

  down: async (queryInterface) => {
    await queryInterface.removeIndex('field_locations', ['city_id']);
    await queryInterface.removeIndex('field_locations', ['country_id']);
    await queryInterface.removeColumn('field_locations', 'city_id');
    await queryInterface.removeColumn('field_locations', 'country_id');
  },
};
