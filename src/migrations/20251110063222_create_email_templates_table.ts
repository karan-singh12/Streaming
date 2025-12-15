import type { Knex } from "knex";


export async function up(knex: Knex): Promise<void> {
  return knex.schema.createTable("email_templates", (table) => {
    table.increments("id").primary();
    table.string("title", 255).notNullable();
    table.string("slug", 255).unique().notNullable();
    table.string("subject", 500).notNullable();
    table.text("content").notNullable();
    table.integer("status").defaultTo(1);
    table.integer("created_by").nullable();
    table.timestamp("created_at", { useTz: true }).defaultTo(knex.fn.now());
    table.timestamp("modified_at", { useTz: true }).defaultTo(knex.fn.now());

    table.index("slug");
    table.index("status");
    table.index("created_by");
  });
}


export async function down(knex: Knex): Promise<void> {
  return knex.schema.dropTableIfExists("email_templates");
}

