"use strict";

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable("product_wishlists", {
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
      product_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: "products", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
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

    await queryInterface.addConstraint("product_wishlists", {
      fields: ["user_id", "product_id"],
      type: "unique",
      name: "uniq_product_wishlists_user_product",
    });

    await queryInterface.addIndex("product_wishlists", ["user_id"], {
      name: "idx_product_wishlists_user_id",
    });

    await queryInterface.addIndex("product_wishlists", ["product_id"], {
      name: "idx_product_wishlists_product_id",
    });
  },

  down: async (queryInterface) => {
    await queryInterface.dropTable("product_wishlists");
  },
};
