import type { Knex } from "knex";


export async function up(knex: Knex): Promise<void> {
  return knex.schema.createTable("emoji_effects", (table) => {
    table.increments("id").primary();
    table.integer("room_session_id").notNullable();
    table.integer("sender_user_id").notNullable();
    table.string("emoji_type", 50).notNullable();
    table.timestamp("triggered_at", { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.timestamp("created_at", { useTz: true }).notNullable().defaultTo(knex.fn.now());

    table.index("room_session_id");
    table.index("sender_user_id");
    table.index("triggered_at");
  });
}


export async function down(knex: Knex): Promise<void> {
  return knex.schema.dropTableIfExists("emoji_effects");
}

