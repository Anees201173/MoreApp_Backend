require("dotenv").config();

const normalizeDbUrl = (raw) => {
  if (!raw) return null;
  let url = String(raw).trim();
  // Strip: psql 'postgresql://...'
  if (url.startsWith("psql")) url = url.replace(/^psql\s+/, "").trim();
  // Strip surrounding quotes
  if (
    (url.startsWith("'") && url.endsWith("'")) ||
    (url.startsWith('"') && url.endsWith('"'))
  ) {
    url = url.slice(1, -1);
  }
  return url;
};

const getConnection = () => {
  const url = normalizeDbUrl(process.env.DB_URL || process.env.DATABASE_URL);

  if (url) {
    return {
      use_env_variable: null,
      url,
    };
  }

  return {
    host: process.env.DB_HOST || "localhost",
    port: process.env.DB_PORT ? parseInt(process.env.DB_PORT, 10) : 5432,
    database: process.env.DB_NAME || null,
    username: process.env.DB_USER || null,
    password: process.env.DB_PASS || null,
  };
};

const base = {
  dialect: "postgres",
  dialectOptions: {
    ssl: {
      require: true,
      rejectUnauthorized: false,
    },
  },
  define: {
    timestamps: true,
    underscored: true,
    freezeTableName: true,
  },
};

module.exports = {
  development: {
    ...base,
    ...getConnection(),
    logging: console.log,
  },

  test: {
    ...base,
    ...getConnection(),
    logging: false,
  },

  production: {
    ...base,
    ...getConnection(),
    logging: false,
    pool: {
      max: 20,
      min: 0,
      acquire: 30000,
      idle: 10000,
    },
  },
};
