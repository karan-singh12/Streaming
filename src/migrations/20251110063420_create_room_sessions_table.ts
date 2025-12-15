import type { Knex } from "knex";


export async function up(knex: Knex): Promise<void> {
  return knex.schema.createTable("room_sessions", (table) => {
    table.increments("id").primary();
    table.string("room_type", 20).notNullable();
    table.integer("pyramid_room_id").unsigned().nullable();
    table.integer("streamer_id").unsigned().notNullable();
    table.timestamp("session_start", { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.timestamp("session_end", { useTz: true }).nullable();
    table.decimal("credits_earned", 10, 2).defaultTo(0);
    table.string("disconnection_type", 30).nullable();
    table.timestamp("created_at", { useTz: true }).notNullable().defaultTo(knex.fn.now());

    table.foreign("streamer_id").references("id").inTable("streamers").onDelete("CASCADE");
    table.foreign("pyramid_room_id").references("id").inTable("pyramid_rooms").onDelete("SET NULL");

    table.index("streamer_id");
    table.index("room_type");
    table.index("session_start");
    table.index("pyramid_room_id");
  });
}


export async function down(knex: Knex): Promise<void> {
  return knex.schema.dropTableIfExists("room_sessions");
}

