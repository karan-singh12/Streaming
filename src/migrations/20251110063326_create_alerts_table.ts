import type { Knex } from "knex";


export async function up(knex: Knex): Promise<void> {
  return knex.schema.createTable("alerts", (table) => {
    table.increments("id").primary();
    table.string("type", 50).notNullable();
    table.string("severity", 20).notNullable();
    table.string("title", 255).notNullable();
    table.text("message").notNullable();
    table.specificType("ip_address", "INET").nullable();
    table.string("affected_endpoint", 500).nullable();
    table.integer("metrics_request_count").nullable();
    table.integer("metrics_time_window").nullable();
    table.integer("metrics_threshold").nullable();
    table.decimal("metrics_error_rate", 5, 2).nullable();
    table.text("metrics_suspicious_patterns").nullable();
    table.text("related_logs").nullable();
    table.integer("status").notNullable().defaultTo(0).comment("0: new, 1: acknowledged, 2: resolved");
    table.string("acknowledged_by", 100).nullable();
    table.timestamp("acknowledged_at", { useTz: true }).nullable();
    table.timestamp("resolved_at", { useTz: true }).nullable();
    table.boolean("notification_sent").notNullable().defaultTo(false);
    table.text("notified_admins").nullable();
    table.timestamp("created_at", { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.timestamp("updated_at", { useTz: true }).notNullable().defaultTo(knex.fn.now());

    table.index("type");
    table.index("severity");
    table.index("ip_address");
    table.index("status");
    table.index(["status", "created_at"]);
    table.index(["severity", "status"]);
    table.index(["type", "created_at"]);
  });
}


export async function down(knex: Knex): Promise<void> {
  return knex.schema.dropTableIfExists("alerts");
}

