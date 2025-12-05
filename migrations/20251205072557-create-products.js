'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('products', {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },

      name: {
        type: Sequelize.STRING(100),
        allowNull: false,
        validate: {
          notEmpty: { msg: 'Product name is required' },
          len: { args: [2, 100], msg: 'Name must be between 2 and 100 characters' }
        }
      },

      description: {
        type: Sequelize.STRING(500),
        allowNull: true
      },

      price: {
        type: Sequelize.FLOAT,
        allowNull: false,
        validate: {
          isFloat: true,
          min: 0
        }
      },

      quantity: {
        type: Sequelize.INTEGER,
        allowNull: false,
        validate: {
          isInt: true,
          min: 0
        }
      },

      size: {
        type: Sequelize.STRING, // 'S', 'M', 'L', 'XL', etc.
        allowNull: true
      },

      color: {
        type: Sequelize.STRING,
        allowNull: true
      },

      uploads: {
        type: Sequelize.ARRAY(Sequelize.STRING),
        defaultValue: []
      },

      energyPoints: {
        type: Sequelize.INTEGER,
        allowNull: true,
        defaultValue: 0
      },

      status: {
        type: Sequelize.BOOLEAN,
        defaultValue: true
      },
      user_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: " SET NULL"
      },

      category_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'categories',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.fn('now')
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.fn('now')
      }
    })
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('products')
  }
};
