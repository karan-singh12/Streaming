import type { Knex } from "knex";


export async function up(knex: Knex): Promise<void> {
  return knex.schema.createTable("user_memberships", (table) => {
    table.increments("id").primary();
    table.integer("user_id").notNullable();
    table.integer("membership_plan_id").notNullable();
    table.timestamp("start_date", { useTz: true }).notNullable();
    table.timestamp("expiration_date", { useTz: true }).notNullable();
    table.integer("status").notNullable().defaultTo(1).comment("0: inactive, 1: active, 2: deleted");
    table.boolean("is_trial").notNullable().defaultTo(false);
    table.boolean("is_auto_renew").notNullable().defaultTo(true);
    table.integer("payment_id").nullable();
    table.timestamp("created_at", { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.timestamp("updated_at", { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.timestamp("cancelled_at", { useTz: true }).nullable();

    table.foreign("user_id").references("id").inTable("users").onDelete("CASCADE");
    table.foreign("membership_plan_id").references("id").inTable("membership_plans").onDelete("RESTRICT");
    table.index("user_id");
    table.index("membership_plan_id");
    table.index("status");
    table.index("expiration_date");
    table.index(["user_id", "status"]);
  });
}


export async function down(knex: Knex): Promise<void> {
  return knex.schema.dropTableIfExists("user_memberships");
}

