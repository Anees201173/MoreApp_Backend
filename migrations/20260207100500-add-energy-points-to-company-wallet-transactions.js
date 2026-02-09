"use strict";

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn(
      "company_wallet_transactions",
      "energy_points",
      {
        type: Sequelize.DECIMAL(12, 2),
        allowNull: true,
      }
    );
  },

  down: async (queryInterface) => {
    await queryInterface.removeColumn(
      "company_wallet_transactions",
      "energy_points"
    );
  },
};
