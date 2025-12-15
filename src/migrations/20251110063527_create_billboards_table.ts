import type { Knex } from "knex";


export async function up(knex: Knex): Promise<void> {
  return knex.schema.createTable("billboards", (table) => {
    table.increments("id").primary();
    table.string("image_url", 500).notNullable();
    table.integer("display_order").notNullable();
    table.boolean("is_active").defaultTo(true);
    table.integer("created_id").nullable();
    table.timestamp("created_at", { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.timestamp("updated_at", { useTz: true }).notNullable().defaultTo(knex.fn.now());

    table.index("display_order");
    table.index("is_active");
    table.index("created_id");
  });
}


export async function down(knex: Knex): Promise<void> {
  return knex.schema.dropTableIfExists("billboards");
}

