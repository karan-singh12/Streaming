import type { Knex } from "knex";


export async function up(knex: Knex): Promise<void> {
  return knex.schema.createTable("cam2cam_pricing_package", (table) => {
    table.increments("id").primary();
    table.string("package_name", 100).notNullable();
    table.integer("duration_minutes").notNullable();
    table.decimal("credit", 5, 2).nullable();
    table.integer("status").notNullable().defaultTo(1);
    table.integer("min_viewer_credits").defaultTo(10);
    table.integer("created_by").notNullable();
    table.integer("updated_by").nullable();
    table.integer("display_order").defaultTo(0);
    table.timestamp("created_at", { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.timestamp("updated_at", { useTz: true }).notNullable().defaultTo(knex.fn.now());

    table.index("status");
    table.index("display_order");
    table.index("duration_minutes");
    table.index("package_name");
  });
}


export async function down(knex: Knex): Promise<void> {
  return knex.schema.dropTableIfExists("cam2cam_pricing_package");
}

