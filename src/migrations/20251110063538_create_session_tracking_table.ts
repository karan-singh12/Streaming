import type { Knex } from "knex";


export async function up(knex: Knex): Promise<void> {
  return knex.schema.createTable("session_tracking", (table) => {
    table.increments("id").primary();
    table.integer("user_id").nullable();
    table.string("session_token", 255).unique().notNullable();
    table.string("device_type", 20).nullable();
    table.string("browser", 50).nullable();
    table.specificType("ip_address", "INET").nullable();
    table.text("user_agent").nullable();
    table.timestamp("login_at", { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.timestamp("last_activity_at", { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.timestamp("logout_at", { useTz: true }).nullable();
    table.boolean("is_active").defaultTo(true);
    table.string("refresh_token_jti", 255).nullable();
    table.timestamp("created_at", { useTz: true }).nullable();
    table.timestamp("updated_at", { useTz: true }).nullable();

    table.index("user_id");
    table.index("session_token");
    table.index("is_active");
    table.index("last_activity_at");
  });
}


export async function down(knex: Knex): Promise<void> {
  return knex.schema.dropTableIfExists("session_tracking");
}

