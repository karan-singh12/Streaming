import type { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  await knex.raw(`CREATE EXTENSION IF NOT EXISTS citext;`);

  return knex.schema.createTable("admins", (table) => {
    table.increments("id").primary();
    table.string("name", 255).notNullable();
    table.specificType("email_address", "citext").unique().notNullable();
    table.text("password_hash").notNullable();
    table.string("role", 20).defaultTo("admin");
    table.text("reset_password_token_hash").nullable();
    table.timestamp("reset_password_expire_at", { useTz: true }).nullable();
    table.text("login_otp_hash").nullable();
    table.timestamp("login_otp_expires_at", { useTz: true }).nullable();
    table.integer("failed_login_attempts").defaultTo(0);
    table.timestamp("lock_until", { useTz: true }).nullable();
    table.integer("status").defaultTo(1);
    table.timestamp("created_at", { useTz: true }).defaultTo(knex.fn.now());
    table.timestamp("updated_at", { useTz: true }).defaultTo(knex.fn.now());
    table.timestamp("password_updated_at", { useTz: true }).nullable();

    table.index("email_address");
    table.index("role");
    table.index("status");
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists("admins");

  await knex.raw(`DROP EXTENSION IF EXISTS citext;`);
}
