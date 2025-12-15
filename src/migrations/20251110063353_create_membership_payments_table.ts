import type { Knex } from "knex";


export async function up(knex: Knex): Promise<void> {
  return knex.schema.createTable("membership_payments", (table) => {
    table.increments("id").primary();
    table.integer("user_id").notNullable();
    table.integer("user_membership_id").notNullable();
    table.integer("membership_plan_id").notNullable();
    table.decimal("payment_amount", 8, 2).notNullable();
    table.integer("duration_months").notNullable();
    table.string("payment_method", 30).notNullable();
    table.string("payment_gateway", 30).defaultTo("ccbill");
    table.string("payment_gateway_ref", 255).nullable();
    table.string("payment_status", 20).notNullable();
    table.timestamp("payment_date", { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.timestamp("created_at", { useTz: true }).notNullable().defaultTo(knex.fn.now());

    table.index("user_id");
    table.index("user_membership_id");
    table.index("membership_plan_id");
    table.index("payment_status");
    table.index("payment_date");
  });
}


export async function down(knex: Knex): Promise<void> {
  return knex.schema.dropTableIfExists("membership_payments");
}

