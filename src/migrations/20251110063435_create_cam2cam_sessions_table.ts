import type { Knex } from "knex";


export async function up(knex: Knex): Promise<void> {
  return knex.schema.createTable("cam2cam_sessions", (table) => {
    table.increments("id").primary();
    table.integer("room_session_id").unique().notNullable();
    table.integer("viewer_id").notNullable();
    table.integer("streamer_id").notNullable();
    table.integer("package_duration_minutes").notNullable();
    table.decimal("package_price", 6, 2).notNullable();
    table.boolean("connection_initiated").defaultTo(false);
    table.timestamp("connection_start", { useTz: true }).nullable();
    table.timestamp("connection_end", { useTz: true }).nullable();
    table.integer("actual_duration_minutes").nullable();
    table.boolean("viewer_disconnected").defaultTo(false);
    table.boolean("streamer_disconnected").defaultTo(false);
    table.boolean("refund_issued").defaultTo(false);
    table.decimal("refund_amount", 6, 2).defaultTo(0);
    table.timestamp("created_at", { useTz: true }).notNullable().defaultTo(knex.fn.now());

    table.index("viewer_id");
    table.index("streamer_id");
    table.index("room_session_id");
  });
}


export async function down(knex: Knex): Promise<void> {
  return knex.schema.dropTableIfExists("cam2cam_sessions");
}

