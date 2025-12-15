import type { Knex } from "knex";


export async function up(knex: Knex): Promise<void> {
  return knex.schema.createTable("cam2cam_pricing", (table) => {
    table.increments("id").primary();
    table.integer("streamer_id").unique().notNullable();
    table.decimal("duration_15_min", 6, 2).notNullable().defaultTo(30);
    table.decimal("duration_30_min", 6, 2).notNullable().defaultTo(55);
    table.decimal("duration_45_min", 6, 2).notNullable().defaultTo(75);
    table.decimal("duration_60_min", 6, 2).notNullable().defaultTo(95);
    table.timestamp("created_at", { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.timestamp("updated_at", { useTz: true }).notNullable().defaultTo(knex.fn.now());

    table.index("streamer_id");
  });
}


export async function down(knex: Knex): Promise<void> {
  return knex.schema.dropTableIfExists("cam2cam_pricing");
}

