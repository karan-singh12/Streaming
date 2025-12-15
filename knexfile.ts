import type { Knex } from "knex";
import dotenv from "dotenv";

dotenv.config();

const config: { [key: string]: Knex.Config } = {
  development: {
    client: "pg",
    connection: {
      host: process.env.DB_HOST || "localhost",
      port: parseInt(process.env.DB_PORT || "5432"),
      user: process.env.DB_USER || "postgres",
      password: process.env.DB_PASS || "",
      database: process.env.DB_NAME || "streaming_live",
      ssl:
        process.env.DB_SSL === "true" ? { rejectUnauthorized: false } : false,
    },
    pool: {
      min: parseInt(process.env.DB_POOL_MIN || "2"),
      max: parseInt(process.env.DB_POOL_MAX || "10"),
    },
    migrations: {
      directory: "./src/migrations",
      extension: "ts",
      tableName: "knex_migrations",
    },
    seeds: {
      directory: "./src/seeds",
    },
  },

  test: {
    client: "pg",
    connection: {
      host: process.env.DB_HOST || "localhost",
      port: parseInt(process.env.DB_PORT || "5432"),
      user: process.env.DB_USER || "postgres",
      password: process.env.DB_PASS || "",
      database: process.env.DB_NAME || "streaming_live_test",
      ssl: false,
    },
    pool: {
      min: 1,
      max: 5,
    },
    migrations: {
      directory: "./src/migrations",
      extension: "ts",
      tableName: "knex_migrations",
    },
    seeds: {
      directory: "./src/seeds",
    },
  },

  production: {
    client: "pg",
    connection: process.env.DB_URL || {
      host: process.env.DB_HOST || "localhost",
      port: parseInt(process.env.DB_PORT || "5432"),
      user: process.env.DB_USER || "postgres",
      password: process.env.DB_PASS || "",
      database: process.env.DB_NAME || "streaming_live",
      ssl:
        process.env.DB_SSL === "true" ? { rejectUnauthorized: false } : false,
    },
    pool: {
      min: parseInt(process.env.DB_POOL_MIN || "2"),
      max: parseInt(process.env.DB_POOL_MAX || "20"),
    },
    migrations: {
      directory: "./src/migrations",
      extension: "ts",
      tableName: "knex_migrations",
    },
    seeds: {
      directory: "./src/seeds",
    },
  },
};

export default config;
