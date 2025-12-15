import type { Knex } from "knex";


export async function up(knex: Knex): Promise<void> {
  return knex.schema.createTable("viewer_room_billing", (table) => {
    table.increments("id").primary();
    table.integer("user_id").notNullable();
    table.integer("room_session_id").notNullable();
    table.timestamp("entry_timestamp", { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.timestamp("exit_timestamp", { useTz: true }).nullable();
    table.integer("total_minutes").nullable();
    table.decimal("billing_rate_per_minute", 5, 2).notNullable();
    table.decimal("total_credits_charged", 10, 2).defaultTo(0);
    table.string("exit_reason", 30).nullable();
    table.timestamp("created_at", { useTz: true }).notNullable().defaultTo(knex.fn.now());

    table.index("user_id");
    table.index("room_session_id");
    table.index("entry_timestamp");
  });
}


export async function down(knex: Knex): Promise<void> {
  return knex.schema.dropTableIfExists("viewer_room_billing");
}

