import type { Knex } from "knex";


export async function up(knex: Knex): Promise<void> {
  return knex.schema.createTable("streamers", (table) => {
    table.increments("id").primary();
    table.integer("user_id").unique().notNullable();
    table.string("unique_id", 10).unique().notNullable();
    table.string("thumbnail", 500).nullable();
    table.text("theme_description").nullable();
    table.integer("age").nullable();
    table.string("height", 20).nullable();
    table.string("weight", 20).nullable();
    table.string("nationality", 100).nullable();
    table.string("attractive_body_part", 100).nullable();
    table.text("specialties").nullable();
    table.text("cam2cam_special_service").nullable();
    table.boolean("is_online").notNullable().defaultTo(false);
    table.string("current_room_type", 20).nullable();
    table.timestamp("created_at", { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.timestamp("updated_at", { useTz: true }).notNullable().defaultTo(knex.fn.now());

    table.foreign("user_id").references("id").inTable("users").onDelete("RESTRICT");

    table.index("user_id");
    table.index("unique_id");
    table.index("is_online");
  });
}


export async function down(knex: Knex): Promise<void> {
  return knex.schema.dropTableIfExists("streamers");
}