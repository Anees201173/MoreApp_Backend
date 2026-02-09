"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn("stores", "category_id", {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: {
        model: "categories",
        key: "id",
      },
      onUpdate: "CASCADE",
      onDelete: "SET NULL",
    });

    await queryInterface.addIndex("stores", ["category_id"], {
      name: "stores_category_id_idx",
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeIndex("stores", "stores_category_id_idx");
    await queryInterface.removeColumn("stores", "category_id");
  },
};
