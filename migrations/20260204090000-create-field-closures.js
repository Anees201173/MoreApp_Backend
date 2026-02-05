'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('field_closures', {
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
      date: {
        type: Sequelize.DATEONLY,
        allowNull: false,
      },
      reason: {
        type: Sequelize.STRING(255),
        allowNull: true,
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

    await queryInterface.addIndex('field_closures', ['field_id'], {
      name: 'idx_field_closures_field_id',
    });

    await queryInterface.addIndex('field_closures', ['field_id', 'date'], {
      name: 'uq_field_closures_field_date',
      unique: true,
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeIndex('field_closures', 'uq_field_closures_field_date');
    await queryInterface.removeIndex('field_closures', 'idx_field_closures_field_id');
    await queryInterface.dropTable('field_closures');
  },
};
