import type { Knex } from "knex";


export async function up(knex: Knex): Promise<void> {
  return knex.schema.createTable("traffic_logs", (table) => {
    table.increments("id").primary();
    table.string("ip", 45).notNullable();
    table.string("method", 10).notNullable();
    table.text("url").notNullable();
    table.integer("status_code").notNullable();
    table.integer("response_time").notNullable().comment("Response time in milliseconds");
    table.text("user_agent").nullable();
    table.string("user_id", 255).nullable().comment("Can reference users.id (integer) or admins.id (UUID)");
    table.string("user_type", 20).nullable().comment("admin, user, guest");
    table.timestamp("timestamp", { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.jsonb("request_body").nullable();
    table.text("error_message").nullable();
    table.boolean("suspicious").notNullable().defaultTo(false);
    table.specificType("suspicion_reasons", "text[]").nullable();
    table.timestamp("created_at", { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.timestamp("updated_at", { useTz: true }).notNullable().defaultTo(knex.fn.now());

    // Single column indexes
    table.index("ip");
    table.index("user_id");
    table.index("timestamp");
    table.index("suspicious");

    // Compound indexes for efficient queries
    table.index(["ip", "timestamp"]);
    table.index(["suspicious", "timestamp"]);

    // Note: PostgreSQL doesn't have built-in TTL like MongoDB
    // You can implement automatic cleanup using:
    // 1. pg_cron extension for scheduled deletion
    // 2. Application-level scheduled job
    // 3. Database trigger (less recommended)
    // Example: DELETE FROM traffic_logs WHERE timestamp < NOW() - INTERVAL '30 days';
  });
}


export async function down(knex: Knex): Promise<void> {
  return knex.schema.dropTableIfExists("traffic_logs");
}

