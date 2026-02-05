"use strict";

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable("field_subscription_plans", {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      field_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: "fields", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      merchant_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: "merchants", key: "id" },
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
      },
      price: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false,
      },
      currency: {
        type: Sequelize.STRING(10),
        allowNull: false,
        defaultValue: "SAR",
      },
      features: {
        type: Sequelize.JSONB,
        allowNull: false,
        defaultValue: [],
      },
      visibility: {
        type: Sequelize.ENUM("public", "private"),
        allowNull: false,
        defaultValue: "public",
      },
      is_active: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true,
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

    await queryInterface.addConstraint("field_subscription_plans", {
      fields: ["field_id", "type"],
      type: "unique",
      name: "uniq_field_subscription_plans_field_type",
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable("field_subscription_plans");
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_field_subscription_plans_type"');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_field_subscription_plans_visibility"');
  },
};
