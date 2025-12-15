import type { Knex } from "knex";


export async function up(knex: Knex): Promise<void> {
    // Create revoked_tokens table
    await knex.schema.createTable("revoked_tokens", (table) => {
        table.increments("id").primary();
        table.string("jti", 255).unique().notNullable();
        table.integer("user_id").nullable();
        table.integer("admin_id").nullable();
        table.timestamp("revoked_at", { useTz: true }).notNullable().defaultTo(knex.fn.now());
        table.integer("revoked_by_user_id").nullable();
        table.integer("revoked_by_admin_id").nullable();
        table.string("reason", 255).nullable();
        table.timestamp("expires_at", { useTz: true }).nullable().comment("Original token expiry for cleanup");

        table.index("jti");
        table.index("user_id");
        table.index("admin_id");
        table.index("revoked_at");
    });
}


export async function down(knex: Knex): Promise<void> {
    await knex.schema.dropTableIfExists("revoked_tokens");
}

