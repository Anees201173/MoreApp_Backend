"use strict";

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // 1) merchants.energy_earning_policy_id
    await queryInterface.addColumn("merchants", "energy_earning_policy_id", {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: { model: "energy_earning_policies", key: "id" },
      onUpdate: "CASCADE",
      onDelete: "SET NULL",
    });

    // Backfill existing merchants to Default policy (id=1 if seeded)
    await queryInterface.sequelize.query(
      'UPDATE "merchants" SET energy_earning_policy_id = (SELECT id FROM "energy_earning_policies" ORDER BY id ASC LIMIT 1) WHERE energy_earning_policy_id IS NULL;'
    );

    await queryInterface.changeColumn("merchants", "energy_earning_policy_id", {
      type: Sequelize.INTEGER,
      allowNull: false,
      references: { model: "energy_earning_policies", key: "id" },
      onUpdate: "CASCADE",
      onDelete: "RESTRICT",
    });

    // 2) orders earned points tracking
    await queryInterface.addColumn("orders", "earned_energy_points", {
      type: Sequelize.DECIMAL(12, 2),
      allowNull: false,
      defaultValue: 0,
    });
    await queryInterface.addColumn("orders", "energy_points_awarded_at", {
      type: Sequelize.DATE,
      allowNull: true,
    });

    // 3) field_bookings earned points tracking
    await queryInterface.addColumn("field_bookings", "earned_energy_points", {
      type: Sequelize.DECIMAL(12, 2),
      allowNull: false,
      defaultValue: 0,
    });
    await queryInterface.addColumn("field_bookings", "energy_points_awarded_at", {
      type: Sequelize.DATE,
      allowNull: true,
    });

    // 4) merchant_subscriptions earned points tracking
    await queryInterface.addColumn("merchant_subscriptions", "earned_energy_points", {
      type: Sequelize.DECIMAL(12, 2),
      allowNull: false,
      defaultValue: 0,
    });
    await queryInterface.addColumn("merchant_subscriptions", "energy_points_awarded_at", {
      type: Sequelize.DATE,
      allowNull: true,
    });
  },

  down: async (queryInterface) => {
    await queryInterface.removeColumn("merchant_subscriptions", "energy_points_awarded_at");
    await queryInterface.removeColumn("merchant_subscriptions", "earned_energy_points");

    await queryInterface.removeColumn("field_bookings", "energy_points_awarded_at");
    await queryInterface.removeColumn("field_bookings", "earned_energy_points");

    await queryInterface.removeColumn("orders", "energy_points_awarded_at");
    await queryInterface.removeColumn("orders", "earned_energy_points");

    await queryInterface.removeColumn("merchants", "energy_earning_policy_id");
  },
};
