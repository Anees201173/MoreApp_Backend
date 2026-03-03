'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('employee_delete_verifications', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      company_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'companies',
          key: 'id',
        },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      },
      company_admin_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id',
        },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      },
      employee_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id',
        },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      },
      code_hash: {
        type: Sequelize.STRING(128),
        allowNull: false,
      },
      expires_at: {
        type: Sequelize.DATE,
        allowNull: false,
      },
      attempts: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      verified_at: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      delete_token_hash: {
        type: Sequelize.STRING(128),
        allowNull: true,
      },
      delete_token_expires_at: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      consumed_at: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.fn('now'),
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.fn('now'),
      },
    });

    await queryInterface.addIndex('employee_delete_verifications', ['company_admin_id', 'employee_id'], {
      name: 'employee_delete_verifications_admin_employee_idx',
    });

    await queryInterface.addIndex('employee_delete_verifications', ['delete_token_hash'], {
      name: 'employee_delete_verifications_delete_token_hash_idx',
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('employee_delete_verifications');
  },
};
