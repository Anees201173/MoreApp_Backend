'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('field_availabilities', {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      field_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'fields', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      day_of_week: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
      start_time: {
        type: Sequelize.TIME,
        allowNull: false,
      },
      end_time: {
        type: Sequelize.TIME,
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

    await queryInterface.addIndex('field_availabilities', ['field_id'], {
      name: 'idx_field_availabilities_field_id',
    });

    await queryInterface.addIndex('field_availabilities', ['field_id', 'day_of_week'], {
      name: 'idx_field_availabilities_field_day',
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeIndex('field_availabilities', 'idx_field_availabilities_field_day');
    await queryInterface.removeIndex('field_availabilities', 'idx_field_availabilities_field_id');
    await queryInterface.dropTable('field_availabilities');
  },
};
