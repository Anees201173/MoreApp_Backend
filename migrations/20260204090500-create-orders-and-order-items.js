"use strict";

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable("orders", {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      user_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: "users", key: "id" },
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
      store_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: "stores", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "SET NULL",
      },
      status: {
        type: Sequelize.ENUM("pending", "paid", "cancelled", "completed"),
        allowNull: false,
        defaultValue: "pending",
      },
      currency: {
        type: Sequelize.STRING(10),
        allowNull: false,
        defaultValue: "SAR",
      },
      subtotal: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0,
      },
      total: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0,
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

    await queryInterface.createTable("order_items", {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      order_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: "orders", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      product_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: "products", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "SET NULL",
      },
      product_title: {
        type: Sequelize.STRING(150),
        allowNull: false,
      },
      product_image: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      quantity: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
      unit_price: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false,
      },
      line_total: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false,
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
  },

  down: async (queryInterface) => {
    await queryInterface.dropTable("order_items");
    await queryInterface.dropTable("orders");
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_orders_status"');
  },
};
