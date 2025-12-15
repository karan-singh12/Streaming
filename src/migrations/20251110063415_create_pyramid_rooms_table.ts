import type { Knex } from "knex";


export async function up(knex: Knex): Promise<void> {
  return knex.schema.createTable("pyramid_rooms", (table) => {
    table.increments("id").primary();
    table.integer("room_position").unique().notNullable();
    table.integer("current_streamer_id").nullable();
    table.integer("room_status").notNullable().defaultTo(0).comment("0: inactive, 1: active, 2: deleted");
    table.boolean("is_pinned").defaultTo(false);
    table.decimal("billing_rate_per_minute", 5, 2).notNullable().defaultTo(0.1);
    table.timestamp("entry_timestamp", { useTz: true }).nullable();
    table.timestamp("created_at", { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.timestamp("updated_at", { useTz: true }).notNullable().defaultTo(knex.fn.now());

    table.foreign("current_streamer_id").references("id").inTable("streamers").onDelete("SET NULL");
    table.index("room_status");
    table.index("current_streamer_id");
    table.index("room_position");
  });
}


export async function down(knex: Knex): Promise<void> {
  return knex.schema.dropTableIfExists("pyramid_rooms");
}

