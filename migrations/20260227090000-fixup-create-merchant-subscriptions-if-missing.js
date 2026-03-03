"use strict";

const SUBSCRIPTIONS_TABLE = "merchant_subscriptions";
const PLANS_TABLE = "merchant_subscription_plans";

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const [[plansReg]] = await queryInterface.sequelize.query(
      `SELECT to_regclass('public.${PLANS_TABLE}') AS reg;`
    );

    if (!plansReg || !plansReg.reg) {
      await queryInterface.createTable(PLANS_TABLE, {
        id: {
          type: Sequelize.INTEGER,
          autoIncrement: true,
          primaryKey: true,
        },
        merchant_id: {
          type: Sequelize.INTEGER,
          allowNull: false,
        },
        subscription_category_id: {
          type: Sequelize.INTEGER,
          allowNull: true,
        },
        title: {
          type: Sequelize.STRING(150),
          allowNull: false,
        },
        description: {
          type: Sequelize.TEXT,
          allowNull: false,
        },
        photo_url: {
          type: Sequelize.STRING(500),
          allowNull: true,
        },
        price: {
          type: Sequelize.DECIMAL(10, 2),
          allowNull: false,
        },
        duration_days: {
          type: Sequelize.INTEGER,
          allowNull: false,
        },
        gift_energy_points: {
          type: Sequelize.INTEGER,
          allowNull: false,
          defaultValue: 0,
        },
        start_date: {
          type: Sequelize.DATEONLY,
          allowNull: true,
        },
        end_date: {
          type: Sequelize.DATEONLY,
          allowNull: true,
        },
        voucher_policy: {
          type: Sequelize.STRING(30),
          allowNull: false,
          defaultValue: "unlimited",
        },
        max_total_uses: {
          type: Sequelize.INTEGER,
          allowNull: true,
        },
        max_uses_per_month: {
          type: Sequelize.INTEGER,
          allowNull: true,
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

      await queryInterface.addIndex(PLANS_TABLE, ["merchant_id"], {
        name: "idx_merchant_subscription_plans_merchant_id",
      });

      await queryInterface.addIndex(PLANS_TABLE, ["merchant_id", "is_active"], {
        name: "idx_merchant_subscription_plans_merchant_active",
      });

      await queryInterface.addIndex(PLANS_TABLE, ["merchant_id", "start_date", "end_date"], {
        name: "merchant_subscription_plans_merchant_window_idx",
      });

      await queryInterface.addIndex(PLANS_TABLE, ["merchant_id", "voucher_policy"], {
        name: "merchant_subscription_plans_merchant_voucher_policy_idx",
      });

      await queryInterface.addIndex(PLANS_TABLE, ["subscription_category_id"], {
        name: "merchant_subscription_plans_subscription_category_id_idx",
      });
    }

    const [[subsReg]] = await queryInterface.sequelize.query(
      `SELECT to_regclass('public.${SUBSCRIPTIONS_TABLE}') AS reg;`
    );

    if (subsReg && subsReg.reg) return;

    await queryInterface.createTable(SUBSCRIPTIONS_TABLE, {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      merchant_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
      user_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
      plan_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      title: {
        type: Sequelize.STRING(150),
        allowNull: false,
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      photo_url: {
        type: Sequelize.STRING(500),
        allowNull: true,
      },
      price: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: true,
      },
      duration_days: {
        type: Sequelize.INTEGER,
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

    await queryInterface.addIndex(SUBSCRIPTIONS_TABLE, ["merchant_id", "user_id"], {
      name: "idx_merchant_subscriptions_merchant_user",
    });

    await queryInterface.addIndex(SUBSCRIPTIONS_TABLE, ["user_id", "status"], {
      name: "idx_merchant_subscriptions_user_status",
    });

    await queryInterface.addIndex(SUBSCRIPTIONS_TABLE, ["merchant_id", "plan_id"], {
      name: "idx_merchant_subscriptions_merchant_plan",
    });

    await queryInterface.addIndex(SUBSCRIPTIONS_TABLE, ["plan_id", "status"], {
      name: "idx_merchant_subscriptions_plan_status",
    });
  },

  down: async (queryInterface) => {
    await queryInterface.sequelize.query(
      `DROP TABLE IF EXISTS "${SUBSCRIPTIONS_TABLE}" CASCADE;`
    );
    await queryInterface.sequelize.query(`DROP TABLE IF EXISTS "${PLANS_TABLE}" CASCADE;`);

    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_merchant_subscriptions_type"');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_merchant_subscriptions_status"');
  },
};
