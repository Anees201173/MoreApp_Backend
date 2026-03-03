'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('merchant_subscription_plans', 'start_date', {
      type: Sequelize.DATEONLY,
      allowNull: true,
    });

    await queryInterface.addColumn('merchant_subscription_plans', 'end_date', {
      type: Sequelize.DATEONLY,
      allowNull: true,
    });

    await queryInterface.addIndex('merchant_subscription_plans', ['merchant_id', 'start_date', 'end_date'], {
      name: 'merchant_subscription_plans_merchant_window_idx',
    });
  },

  async down(queryInterface) {
    await queryInterface.removeIndex('merchant_subscription_plans', 'merchant_subscription_plans_merchant_window_idx');
    await queryInterface.removeColumn('merchant_subscription_plans', 'end_date');
    await queryInterface.removeColumn('merchant_subscription_plans', 'start_date');
  },
};
