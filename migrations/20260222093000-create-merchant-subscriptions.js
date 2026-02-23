"use strict";

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable("merchant_subscriptions", {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      merchant_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: "merchants", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      user_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: "users", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      title: {
        type: Sequelize.STRING(150),
        allowNull: false,
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      type: {
        type: Sequelize.ENUM("monthly", "quarterly", "yearly"),
        allowNull: false,
        defaultValue: "monthly",
      },
      start_date: {
        type: Sequelize.DATEONLY,
        allowNull: false,
      },
      end_date: {
        type: Sequelize.DATEONLY,
        allowNull: false,
      },
      status: {
        type: Sequelize.ENUM("active", "cancelled", "expired"),
        allowNull: false,
        defaultValue: "active",
      },
      created_at: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal("NOW()"),
      },
      updated_at: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal("NOW()"),
      },
    });

    await queryInterface.addIndex("merchant_subscriptions", ["merchant_id", "user_id"], {
      name: "idx_merchant_subscriptions_merchant_user",
    });

    await queryInterface.addIndex("merchant_subscriptions", ["user_id", "status"], {
      name: "idx_merchant_subscriptions_user_status",
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable("merchant_subscriptions");
    await queryInterface.sequelize.query(
      'DROP TYPE IF EXISTS "enum_merchant_subscriptions_type"'
    );
    await queryInterface.sequelize.query(
      'DROP TYPE IF EXISTS "enum_merchant_subscriptions_status"'
    );
  },
};
