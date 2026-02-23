"use strict";

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn("merchant_subscriptions", "plan_id", {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: { model: "merchant_subscription_plans", key: "id" },
      onUpdate: "CASCADE",
      onDelete: "SET NULL",
    });

    await queryInterface.addIndex("merchant_subscriptions", ["merchant_id", "plan_id"], {
      name: "idx_merchant_subscriptions_merchant_plan",
    });

    await queryInterface.addIndex("merchant_subscriptions", ["plan_id", "status"], {
      name: "idx_merchant_subscriptions_plan_status",
    });
  },

  down: async (queryInterface) => {
    await queryInterface.removeIndex("merchant_subscriptions", "idx_merchant_subscriptions_plan_status");
    await queryInterface.removeIndex("merchant_subscriptions", "idx_merchant_subscriptions_merchant_plan");
    await queryInterface.removeColumn("merchant_subscriptions", "plan_id");
  },
};
