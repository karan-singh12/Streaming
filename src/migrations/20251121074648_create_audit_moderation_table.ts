import type { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
    // Create admin_audit_log table
    await knex.schema.createTable("admin_audit_log", (table) => {
        table.increments("id").primary();
        table.integer("admin_id").notNullable();
        table.string("action", 100).notNullable();
        table.string("target_type", 50).nullable().comment("user|admin|streamer|room|etc");
        table.integer("target_id").nullable();
        table.jsonb("details").nullable();
        table.specificType("ip", "INET").nullable();
        table.text("user_agent").nullable();
        table.timestamp("created_at", { useTz: true }).notNullable().defaultTo(knex.fn.now());

        table.foreign("admin_id").references("id").inTable("admins").onDelete("CASCADE");
        table.index("admin_id");
        table.index("action");
        table.index("target_type");
        table.index("created_at");
        table.index(["admin_id", "created_at"]);
    });

    // Create moderation_actions table
    await knex.schema.createTable("moderation_actions", (table) => {
        table.increments("id").primary();
        table.integer("reported_by").nullable().comment("User ID who reported");
        table.integer("reported_user_id").nullable();
        table.integer("reported_streamer_id").nullable();
        table.string("action_type", 50).notNullable().comment("warn|ban|suspend|unban|delete");
        table.text("reason").nullable();
        table.string("status", 50).defaultTo("pending").comment("pending|approved|rejected|executed");
        table.integer("moderated_by").nullable().comment("Admin ID");
        table.timestamp("created_at", { useTz: true }).notNullable().defaultTo(knex.fn.now());
        table.timestamp("executed_at", { useTz: true }).nullable();

        table.foreign("reported_by").references("id").inTable("users").onDelete("SET NULL");
        table.foreign("reported_user_id").references("id").inTable("users").onDelete("SET NULL");
        table.foreign("reported_streamer_id").references("id").inTable("streamers").onDelete("SET NULL");
        table.foreign("moderated_by").references("id").inTable("admins").onDelete("SET NULL");
        table.index("reported_by");
        table.index("reported_user_id");
        table.index("status");
        table.index("created_at");
    });

    // Create alert_notifications table (replace ad-hoc fields)
    await knex.schema.createTable("alert_notifications", (table) => {
        table.increments("id").primary();
        table.integer("alert_id").notNullable();
        table.integer("admin_id").notNullable();
        table.string("delivery_status", 50).defaultTo("pending").comment("pending|sent|delivered|failed");
        table.timestamp("sent_at", { useTz: true }).nullable();
        table.timestamp("read_at", { useTz: true }).nullable();
        table.text("error").nullable();

        table.foreign("alert_id").references("id").inTable("alerts").onDelete("CASCADE");
        table.foreign("admin_id").references("id").inTable("admins").onDelete("CASCADE");
        table.index("alert_id");
        table.index("admin_id");
        table.index("delivery_status");
        table.index(["alert_id", "admin_id"]);
    });

    // Update alerts table
    await knex.schema.alterTable("alerts", (table) => {
        table.integer("acknowledged_by_admin_id").nullable();
        table.dropColumn("acknowledged_by");
        table.dropColumn("notification_sent");
        table.dropColumn("notified_admins");

        table.foreign("acknowledged_by_admin_id").references("id").inTable("admins").onDelete("SET NULL");
        table.index("acknowledged_by_admin_id");
    });

    // Convert alerts timestamps to TIMESTAMPTZ
    await knex.raw(`
    ALTER TABLE alerts 
    ALTER COLUMN created_at TYPE TIMESTAMPTZ,
    ALTER COLUMN updated_at TYPE TIMESTAMPTZ,
    ALTER COLUMN acknowledged_at TYPE TIMESTAMPTZ,
    ALTER COLUMN resolved_at TYPE TIMESTAMPTZ;
  `);
}

export async function down(knex: Knex): Promise<void> {
    await knex.schema.dropTableIfExists("alert_notifications");
    await knex.schema.dropTableIfExists("moderation_actions");
    await knex.schema.dropTableIfExists("admin_audit_log");

    await knex.schema.alterTable("alerts", (table) => {
        table.string("acknowledged_by", 100).nullable();
        table.boolean("notification_sent").defaultTo(false);
        table.text("notified_admins").nullable();
        table.dropColumn("acknowledged_by_admin_id");
    });

    await knex.raw(`
    ALTER TABLE alerts 
    ALTER COLUMN created_at TYPE TIMESTAMP,
    ALTER COLUMN updated_at TYPE TIMESTAMP,
    ALTER COLUMN acknowledged_at TYPE TIMESTAMP,
    ALTER COLUMN resolved_at TYPE TIMESTAMP;
  `);
}

