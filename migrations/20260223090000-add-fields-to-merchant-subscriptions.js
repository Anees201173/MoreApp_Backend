"use strict";

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn("merchant_subscriptions", "photo_url", {
      type: Sequelize.STRING(500),
      allowNull: true,
    });

    await queryInterface.addColumn("merchant_subscriptions", "price", {
      type: Sequelize.DECIMAL(10, 2),
      allowNull: true,
    });

    await queryInterface.addColumn("merchant_subscriptions", "duration_days", {
      type: Sequelize.INTEGER,
      allowNull: true,
    });
  },

  down: async (queryInterface) => {
    await queryInterface.removeColumn("merchant_subscriptions", "duration_days");
    await queryInterface.removeColumn("merchant_subscriptions", "price");
    await queryInterface.removeColumn("merchant_subscriptions", "photo_url");
  },
};
