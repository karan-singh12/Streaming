import type { Knex } from "knex";


export async function up(knex: Knex): Promise<void> {
  return knex.schema.createTable("cms", (table) => {
    table.increments("id").primary();
    table.string("title", 255).notNullable();
    table.text("description").notNullable();
    table.string("content_type", 100).notNullable();
    table.string("slug", 100).unique().notNullable();
    table.integer("status").defaultTo(1);
    table.timestamp("created_at", { useTz: true }).defaultTo(knex.fn.now());
    table.timestamp("modified_at", { useTz: true }).defaultTo(knex.fn.now());
    table.integer("created_by").nullable();

    table.index("slug");
    table.index("content_type");
    table.index("status");
    table.index("created_by");
  });
}


export async function down(knex: Knex): Promise<void> {
  return knex.schema.dropTableIfExists("cms");
}

