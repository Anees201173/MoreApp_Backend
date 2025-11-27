const { Sequelize } = require('sequelize');
const config = require('./config');

let sequelize;

// Prefer an explicit URL (Neon style) if provided
if (config.database && config.database.url) {
  sequelize = new Sequelize(config.database.url, {
    dialect: 'postgres',
    logging: config.nodeEnv === 'development' ? console.log : false,
    dialectOptions: {
      ssl: { require: true, rejectUnauthorized: false }
    },
    define: { timestamps: true, underscored: true, freezeTableName: true },
    pool: { max: config.nodeEnv === 'production' ? 20 : 5, min: 0, acquire: 30000, idle: 10000 }
  });
} else {
  // use individual DB_* env vars
  sequelize = new Sequelize(config.database.name, config.database.user, config.database.password, {
    host: config.database.host,
    port: config.database.port,
    dialect: 'postgres',
    logging: config.nodeEnv === 'development' ? console.log : false,
    dialectOptions: { ssl: { require: false } },
    define: { timestamps: true, underscored: true, freezeTableName: true },
    pool: { max: config.nodeEnv === 'production' ? 20 : 5, min: 0, acquire: 30000, idle: 10000 }
  });
}

// Helper functions to manage connection lifecycle
const connectDatabase = async () => {
  try {
    await sequelize.authenticate();
    console.log(' Database connection established successfully.');
    if (config.nodeEnv === 'development') {
      await sequelize.sync({ alter: true });
      console.log(' Database models synchronized.');
    }
  } catch (error) {
    console.error(' Unable to connect to the database:', error.message);
    throw error;
  }
};

const closeDatabase = async () => {
  try {
    await sequelize.close();
    console.log(' Database connection closed.');
  } catch (error) {
    console.error(' Error closing database connection:', error.message);
    throw error;
  }
};

module.exports = {
  sequelize,
  connectDatabase,
  closeDatabase
};