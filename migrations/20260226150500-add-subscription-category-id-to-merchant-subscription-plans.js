'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('merchant_subscription_plans', 'subscription_category_id', {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: {
        model: 'subscription_categories',
        key: 'id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
    });

    await queryInterface.addIndex('merchant_subscription_plans', ['subscription_category_id'], {
      name: 'merchant_subscription_plans_subscription_category_id_idx',
    });
  },

  async down(queryInterface) {
    await queryInterface.removeIndex('merchant_subscription_plans', 'merchant_subscription_plans_subscription_category_id_idx');
    await queryInterface.removeColumn('merchant_subscription_plans', 'subscription_category_id');
  },
};
