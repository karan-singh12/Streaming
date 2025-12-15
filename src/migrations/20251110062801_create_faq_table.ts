import type { Knex } from "knex";


export async function up(knex: Knex): Promise<void> {
  return knex.schema.createTable("faqs", (table) => {
    table.increments("id").primary();
    table.string("title", 500).nullable();
    table.text("description").nullable();
    table.integer("status").defaultTo(1);
    table.timestamp("created_at", { useTz: true }).defaultTo(knex.fn.now());
    table.timestamp("modified_at", { useTz: true }).defaultTo(knex.fn.now());
    table.integer("created_by").nullable();

    table.index("status");
    table.index("created_by");
  });
}


export async function down(knex: Knex): Promise<void> {
  return knex.schema.dropTableIfExists("faqs");
}

