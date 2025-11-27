require("dotenv").config();

module.exports = {
  development: {
    url: process.env.DB_URL,
    dialect: "postgres",
    dialectOptions: {
      ssl: {
        require: true,
        rejectUnauthorized: false
      }
    },
    logging: console.log,
    define: {
      timestamps: true,
      underscored: true,
      freezeTableName: true,
    },
  },

  test: {
    url: process.env.DB_URL,
    dialect: "postgres",
    dialectOptions: {
      ssl: {
        require: true,
        rejectUnauthorized: false
      }
    },
    logging: false,
    define: {
      timestamps: true,
      underscored: true,
      freezeTableName: true,
    },
  },

  production: {
    url: process.env.DB_URL,
    dialect: "postgres",
    dialectOptions: {
      ssl: {
        require: true,
        rejectUnauthorized: false
      }
    },
    logging: false,
    define: {
      timestamps: true,
      underscored: true,
      freezeTableName: true,
    },
    pool: {
      max: 20,
      min: 0,
      acquire: 30000,
      idle: 10000,
    },
  },
};
