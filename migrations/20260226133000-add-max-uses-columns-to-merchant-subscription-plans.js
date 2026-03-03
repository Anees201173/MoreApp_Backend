'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const table = await queryInterface.describeTable('merchant_subscription_plans');

    if (!table.max_total_uses) {
      await queryInterface.addColumn('merchant_subscription_plans', 'max_total_uses', {
        type: Sequelize.INTEGER,
        allowNull: true,
      });
    }

    if (!table.max_uses_per_month) {
      await queryInterface.addColumn('merchant_subscription_plans', 'max_uses_per_month', {
        type: Sequelize.INTEGER,
        allowNull: true,
      });
    }

    // Backfill from older column name if present
    if (table.voucher_uses_per_month && !table.max_uses_per_month) {
      await queryInterface.sequelize.query(
        'UPDATE merchant_subscription_plans SET max_uses_per_month = voucher_uses_per_month WHERE max_uses_per_month IS NULL'
      );
    }
  },

  async down(queryInterface) {
    const table = await queryInterface.describeTable('merchant_subscription_plans');

    if (table.max_uses_per_month) {
      await queryInterface.removeColumn('merchant_subscription_plans', 'max_uses_per_month');
    }

    if (table.max_total_uses) {
      await queryInterface.removeColumn('merchant_subscription_plans', 'max_total_uses');
    }
  },
};
