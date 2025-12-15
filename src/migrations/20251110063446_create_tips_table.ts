import type { Knex } from "knex";


export async function up(knex: Knex): Promise<void> {
  return knex.schema.createTable("tips", (table) => {
    table.increments("id").primary();
    table.integer("room_session_id").notNullable();
    table.integer("tipper_user_id").notNullable();
    table.integer("streamer_id").notNullable();
    table.decimal("tip_amount", 8, 2).notNullable();
    table.integer("video_connection_minutes").notNullable();
    table.integer("queue_position").nullable();
    table.string("connection_status", 30).notNullable().defaultTo("waiting");
    table.timestamp("connection_start", { useTz: true }).nullable();
    table.timestamp("connection_end", { useTz: true }).nullable();
    table.integer("actual_duration_minutes").nullable();
    table.boolean("tipper_left_room").defaultTo(false);
    table.boolean("streamer_disconnected").defaultTo(false);
    table.boolean("refund_issued").defaultTo(false);
    table.timestamp("tip_timestamp", { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.timestamp("created_at", { useTz: true }).notNullable().defaultTo(knex.fn.now());

    table.index("room_session_id");
    table.index("tipper_user_id");
    table.index("streamer_id");
    table.index("connection_status");
    table.index(["room_session_id", "queue_position"]);
  });
}


export async function down(knex: Knex): Promise<void> {
  return knex.schema.dropTableIfExists("tips");
}

