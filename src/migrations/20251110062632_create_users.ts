import type { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  return knex.schema.createTable("users", (table) => {
    table.increments("id").primary();
    table.specificType("email_address", "citext").unique().notNullable();
    table.string("password_hash", 255).notNullable();
    table.string("role", 50).notNullable().defaultTo("user");
    table.string("nickname", 50).notNullable();
    table.string("avatar", 500).nullable();
    table.integer("status").notNullable().defaultTo(1);
    table.boolean("is_age_verified").nullable();
    table.string("age_verification_method", 50).nullable();
    table.string("token_of_trust", 50).nullable();
    table.string("language", 50).notNullable();
    table.timestamp("registration_date", { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.text("otp_hash").nullable();
    table.timestamp("otp_expires_at").nullable();
    table.boolean("email_verified").defaultTo(false);
    table.timestamp("created_at", { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.timestamp("updated_at", { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.timestamp("last_login_at", { useTz: true }).nullable();
    table.timestamp("password_updated_at", { useTz: true }).nullable();
    table.integer("failed_login_attempts").defaultTo(0);
    table.timestamp("lock_until", { useTz: true }).nullable();
    table.text("reset_password_token_hash").nullable();
    table.timestamp("reset_password_expires_at", { useTz: true }).nullable();

    table.index("email_address");
    table.index("role");
    table.index("status");
    table.index("created_at");
  });
}

export async function down(knex: Knex): Promise<void> {
  return knex.schema.dropTableIfExists("users");
}