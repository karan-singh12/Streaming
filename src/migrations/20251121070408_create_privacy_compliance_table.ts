import type { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
    // Create user_consent_logs table
    await knex.schema.createTable("user_consent_logs", (table) => {
        table.increments("id").primary();
        table.integer("user_id").notNullable();
        table.string("action", 20).notNullable().comment("given|withdrawn");
        table.string("policy_version", 50).notNullable();
        table.jsonb("purposes").nullable().comment("JSON array of consent purposes");
        table.string("channel", 20).nullable().comment("web|app");
        table.specificType("ip", "INET").nullable();
        table.text("user_agent").nullable();
        table.string("country", 2).nullable();
        table.timestamp("created_at", { useTz: true }).notNullable().defaultTo(knex.fn.now());

        table.foreign("user_id").references("id").inTable("users").onDelete("CASCADE");
        table.index("user_id");
        table.index("action");
        table.index("created_at");
        table.index(["user_id", "action"]);
    });

    // Create data_access_logs table
    await knex.schema.createTable("data_access_logs", (table) => {
        table.increments("id").primary();
        table.integer("subject_user_id").notNullable();
        table.integer("actor_admin_id").nullable();
        table.string("source", 50).notNullable().comment("api|admin|export|job");
        table.string("operation", 20).notNullable().comment("read|export|update|delete");
        table.string("resource", 255).nullable().comment("Table or resource name");
        table.text("reason").nullable();
        table.string("request_id", 255).nullable();
        table.specificType("ip", "INET").nullable();
        table.text("user_agent").nullable();
        table.timestamp("created_at", { useTz: true }).notNullable().defaultTo(knex.fn.now());

        table.foreign("subject_user_id").references("id").inTable("users").onDelete("CASCADE");
        table.foreign("actor_admin_id").references("id").inTable("admins").onDelete("SET NULL");
        table.index("subject_user_id");
        table.index("actor_admin_id");
        table.index("source");
        table.index("operation");
        table.index("created_at");
        table.index(["subject_user_id", "created_at"]);
    });

    // Create erasure_requests table (DSAR)
    await knex.schema.createTable("erasure_requests", (table) => {
        table.increments("id").primary();
        table.integer("user_id").notNullable();
        table.string("status", 50).notNullable().defaultTo("received")
            .comment("received|verified|in_progress|done|rejected|legal_hold");
        table.text("scope").nullable().comment("What data to delete");
        table.text("reason").nullable();
        table.timestamp("received_at", { useTz: true }).notNullable().defaultTo(knex.fn.now());
        table.timestamp("verified_at", { useTz: true }).nullable();
        table.timestamp("processed_at", { useTz: true }).nullable();
        table.integer("processed_by").nullable().comment("Admin ID who processed");
        table.text("evidence_url").nullable();
        table.text("notes").nullable();

        table.foreign("user_id").references("id").inTable("users").onDelete("CASCADE");
        table.foreign("processed_by").references("id").inTable("admins").onDelete("SET NULL");
        table.index("user_id");
        table.index("status");
        table.index("received_at");
        table.index(["user_id", "status"]);
    });
}

export async function down(knex: Knex): Promise<void> {
    await knex.schema.dropTableIfExists("erasure_requests");
    await knex.schema.dropTableIfExists("data_access_logs");
    await knex.schema.dropTableIfExists("user_consent_logs");
}

