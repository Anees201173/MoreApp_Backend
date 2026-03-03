'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('merchant_subscription_plans', 'voucher_policy', {
      type: Sequelize.STRING(30),
      allowNull: false,
      defaultValue: 'unlimited',
    });

    await queryInterface.addColumn('merchant_subscription_plans', 'max_total_uses', {
      type: Sequelize.INTEGER,
      allowNull: true,
    });

    await queryInterface.addColumn('merchant_subscription_plans', 'max_uses_per_month', {
      type: Sequelize.INTEGER,
      allowNull: true,
    });

    await queryInterface.addIndex('merchant_subscription_plans', ['merchant_id', 'voucher_policy'], {
      name: 'merchant_subscription_plans_merchant_voucher_policy_idx',
    });
  },

  async down(queryInterface) {
    await queryInterface.removeIndex(
      'merchant_subscription_plans',
      'merchant_subscription_plans_merchant_voucher_policy_idx'
    );
    await queryInterface.removeColumn('merchant_subscription_plans', 'max_uses_per_month');
    await queryInterface.removeColumn('merchant_subscription_plans', 'max_total_uses');
    await queryInterface.removeColumn('merchant_subscription_plans', 'voucher_policy');
  },
};
