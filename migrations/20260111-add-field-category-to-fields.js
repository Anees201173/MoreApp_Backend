"use strict";

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn("fields", "field_category_id", {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: { model: "field_categories", key: "id" },
      onUpdate: "CASCADE",
      onDelete: "SET NULL",
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn("fields", "field_category_id");
  },
};
