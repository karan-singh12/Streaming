import type { Knex } from "knex";


export async function up(knex: Knex): Promise<void> {
    // Create refresh_tokens table
    await knex.schema.createTable("refresh_tokens", (table) => {
        table.increments("id").primary();
        table.integer("user_id").nullable();
        table.integer("admin_id").nullable();
        table.string("jti", 255).unique().notNullable().comment("JWT ID - unique token identifier");
        table.text("token_hash").notNullable();
        table.timestamp("expires_at", { useTz: true }).notNullable();
        table.timestamp("created_at", { useTz: true }).notNullable().defaultTo(knex.fn.now());
        table.timestamp("last_used_at", { useTz: true }).nullable();
        table.string("ip_address", 45).nullable();
        table.text("user_agent").nullable();
        table.boolean("is_active").defaultTo(true);

        table.index("user_id");
        table.index("admin_id");
        table.index("jti");
        table.index("expires_at");
        table.index(["user_id", "is_active"]);
        table.index(["admin_id", "is_active"]);
    });
}


export async function down(knex: Knex): Promise<void> {
    await knex.schema.dropTableIfExists("refresh_tokens");
}

