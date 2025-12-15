import type { Knex } from "knex";


export async function up(knex: Knex): Promise<void> {
  return knex.schema.createTable("membership_plans", (table) => {
    table.increments("id").primary();
    table.string("plan_name", 50).unique().notNullable();
    table.string("plan_type", 20).unique().notNullable();
    table.decimal("price_monthly", 8, 2).notNullable();
    table.jsonb("features").nullable();
    table.decimal("credit_discount_percentage", 5, 2).defaultTo(0);
    table.integer("trial_duration_days").nullable();
    table.boolean("is_active").notNullable().defaultTo(true);
    table.integer("display_order").notNullable().defaultTo(0);
    table.integer("created_by").nullable();
    table.timestamp("created_at", { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.timestamp("updated_at", { useTz: true }).notNullable().defaultTo(knex.fn.now());

    table.index("plan_type");
    table.index("is_active");
    table.index("display_order");
  });
}


export async function down(knex: Knex): Promise<void> {
  return knex.schema.dropTableIfExists("membership_plans");
}

