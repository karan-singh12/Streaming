import type { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
    // Create admin_mfa_settings table
    await knex.schema.createTable("admin_mfa_settings", (table) => {
        table.increments("id").primary();
        table.integer("admin_id").unique().notNullable();
        table.boolean("mfa_enabled").defaultTo(false);
        table.string("mfa_method", 20).nullable().comment("totp|sms|email");
        table.text("secret_hash").nullable().comment("Encrypted TOTP secret");
        table.text("backup_codes_hash").nullable().comment("Hashed backup codes JSON array");
        table.timestamp("created_at", { useTz: true }).notNullable().defaultTo(knex.fn.now());
        table.timestamp("updated_at", { useTz: true }).notNullable().defaultTo(knex.fn.now());
        table.foreign("admin_id").references("id").inTable("admins").onDelete("CASCADE");
        table.index("admin_id");
    });

    // Create mfa_challenges table
    await knex.schema.createTable("mfa_challenges", (table) => {
        table.increments("id").primary();
        table.integer("admin_id").nullable();
        table.string("challenge_type", 20).notNullable().comment("login|password_reset|email_change");
        table.text("otp_hash").notNullable();
        table.timestamp("expires_at", { useTz: true }).notNullable();
        table.integer("attempts").defaultTo(0);
        table.integer("max_attempts").defaultTo(3);
        table.boolean("verified").defaultTo(false);
        table.string("ip_address", 45).nullable();
        table.text("user_agent").nullable();
        table.timestamp("created_at", { useTz: true }).notNullable().defaultTo(knex.fn.now());
        table.timestamp("verified_at", { useTz: true }).nullable();

        table.index("admin_id");
        table.index("expires_at");
        table.index(["admin_id", "challenge_type", "verified"]);
    });
}

export async function down(knex: Knex): Promise<void> {
    await knex.schema.dropTableIfExists("mfa_challenges");
    await knex.schema.dropTableIfExists("admin_mfa_settings");
}