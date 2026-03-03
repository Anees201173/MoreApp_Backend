'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('merchant_subscription_redemptions', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      subscription_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'merchant_subscriptions',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      merchant_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'merchants',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      user_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      redeemed_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('NOW()'),
      },
      created_at: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('NOW()'),
      },
      updated_at: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('NOW()'),
      },
    });

    await queryInterface.addIndex('merchant_subscription_redemptions', ['subscription_id', 'redeemed_at'], {
      name: 'merchant_subscription_redemptions_subscription_redeemed_at_idx',
    });

    await queryInterface.addIndex('merchant_subscription_redemptions', ['merchant_id', 'user_id'], {
      name: 'merchant_subscription_redemptions_merchant_user_idx',
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('merchant_subscription_redemptions');
  },
};
