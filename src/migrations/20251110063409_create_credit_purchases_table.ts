import type { Knex } from "knex";


export async function up(knex: Knex): Promise<void> {
  return knex.schema.createTable("credit_purchases", (table) => {
    table.increments("id").primary();
    table.integer("user_id").notNullable();
    table.decimal("credits_purchased", 10, 2).notNullable();
    table.decimal("amount_usd", 10, 2).notNullable();
    table.decimal("discount_applied", 5, 2).defaultTo(0);
    table.decimal("final_amount_usd", 10, 2).notNullable();
    table.string("payment_method", 30).notNullable();
    table.string("payment_gateway", 30).defaultTo("ccbill");
    table.string("payment_gateway_ref", 255).nullable();
    table.string("payment_status", 20).notNullable();
    table.timestamp("purchase_date", { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.timestamp("created_at", { useTz: true }).notNullable().defaultTo(knex.fn.now());

    table.index("user_id");
    table.index("payment_status");
    table.index("purchase_date");
  });
}


export async function down(knex: Knex): Promise<void> {
  return knex.schema.dropTableIfExists("credit_purchases");
}

