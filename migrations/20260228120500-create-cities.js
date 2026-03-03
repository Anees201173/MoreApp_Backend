'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('cities', {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      country_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'countries', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
      },
      name: {
        type: Sequelize.STRING(100),
        allowNull: false,
      },
      is_active: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
      created_at: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('NOW()'),
      },
      updated_at: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('NOW()'),
      },
    });

    await queryInterface.addConstraint('cities', {
      fields: ['country_id', 'name'],
      type: 'unique',
      name: 'cities_country_id_name_unique',
    });

    await queryInterface.addIndex('cities', ['country_id']);
    await queryInterface.addIndex('cities', ['is_active']);
  },

  down: async (queryInterface) => {
    await queryInterface.dropTable('cities');
  },
};
