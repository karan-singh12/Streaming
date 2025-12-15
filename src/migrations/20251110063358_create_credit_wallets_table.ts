import type { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  return knex.schema.createTable("credit_wallets", (table) => {
    table.increments("id").primary();
    table.integer("user_id").unique().notNullable();
    table.decimal("balance", 10, 2).notNullable().defaultTo(0);
    table.decimal("frozen_credits", 10, 2).notNullable().defaultTo(0);
    table.decimal("total_spent", 12, 2).notNullable().defaultTo(0);

    table.check("balance >= 0");
    table.check("frozen_credits >= 0");

    table.timestamp("created_at", { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.timestamp("updated_at", { useTz: true }).notNullable().defaultTo(knex.fn.now());

    table.foreign("user_id").references("id").inTable("users").onDelete("RESTRICT");
    table.index("user_id");
  });
}

export async function down(knex: Knex): Promise<void> {
  return knex.schema.dropTableIfExists("credit_wallets");
}