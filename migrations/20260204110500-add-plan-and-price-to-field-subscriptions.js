"use strict";

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn("field_subscriptions", "plan_id", {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: { model: "field_subscription_plans", key: "id" },
      onUpdate: "CASCADE",
      onDelete: "SET NULL",
    });

    await queryInterface.addColumn("field_subscriptions", "price", {
      type: Sequelize.DECIMAL(10, 2),
      allowNull: true,
    });

    await queryInterface.addColumn("field_subscriptions", "currency", {
      type: Sequelize.STRING(10),
      allowNull: false,
      defaultValue: "SAR",
    });
  },

  down: async (queryInterface) => {
    await queryInterface.removeColumn("field_subscriptions", "currency");
    await queryInterface.removeColumn("field_subscriptions", "price");
    await queryInterface.removeColumn("field_subscriptions", "plan_id");
  },
};
