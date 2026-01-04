import knex, { Knex } from "knex";
import { config as appConfig } from "./index";

let db: Knex;

const connectDB = async (): Promise<void> => {
  try {
    const environment = appConfig.env;

    // Get database configuration from centralized config
    const config: Knex.Config = {
      client: "pg",
      connection: appConfig.db.url || {
        host: appConfig.db.host,
        port: appConfig.db.port,
        user: appConfig.db.user,
        password: appConfig.db.pass,
        database: appConfig.db.name,
        ssl: appConfig.db.ssl ? { rejectUnauthorized: false } : false,
      },
      pool: {
        min: appConfig.db.pool.min,
        max: appConfig.db.pool.max,
      },
      migrations: {
        directory: "./src/migrations",
        extension: "ts",
        tableName: "knex_migrations",
      },
      seeds: {
        directory: "./src/seeds",
      },
    };

    db = knex(config);

    // Test the connection
    await db.raw("SELECT 1");
    console.log("Postgresql database connection successful");
  } catch (error) {
    console.error("Failed to connect to the database:", error);
    throw error;
  }
};

const disconnectDB = async (): Promise<void> => {
  try {
    if (db) {
      await db.destroy();
      console.log(" Database connection closed");
    }
  } catch (error) {
    console.error(" Error closing database connection:", error);
    throw error;
  }
};

const getDB = (): Knex => {
  if (!db) {
    throw new Error("Database not initialized. Call connectDB() first.");
  }
  return db;
};

export default connectDB;
export { disconnectDB, getDB };