"use strict";

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('fields', 'city', {
      type: Sequelize.STRING(100),
      allowNull: true,
    });

    await queryInterface.addColumn('fields', 'latitude', {
      type: Sequelize.DOUBLE,
      allowNull: true,
    });

    await queryInterface.addColumn('fields', 'longitude', {
      type: Sequelize.DOUBLE,
      allowNull: true,
    });

    await queryInterface.addColumn('fields', 'price_per_hour', {
      type: Sequelize.DECIMAL(10, 2),
      allowNull: true,
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('fields', 'city');
    await queryInterface.removeColumn('fields', 'latitude');
    await queryInterface.removeColumn('fields', 'longitude');
    await queryInterface.removeColumn('fields', 'price_per_hour');
  },
};
