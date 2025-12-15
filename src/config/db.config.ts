import knex, { Knex } from "knex";

let db: Knex;

const connectDB = async (): Promise<void> => {
  try {
    const environment = process.env.NODE_ENV || "development";

    // Get database configuration from environment variables or use defaults
    const config: Knex.Config = {
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
