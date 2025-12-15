import type { Knex } from "knex";


export async function up(knex: Knex): Promise<void> {
  return knex.schema.createTable("notifications", (table) => {
    table.increments("id").primary();
    table.integer("sender_user_id").nullable();
    table.integer("sender_admin_id").nullable();
    table.integer("receiver_user_id").nullable();
    table.integer("receiver_admin_id").nullable();
    table.string("notification_type", 30).notNullable();
    table.string("title", 255).notNullable();
    table.text("message").notNullable();
    table.boolean("is_read").defaultTo(false);
    table.string("delivery_method", 20).notNullable();
    table.timestamp("sent_at", { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.timestamp("read_at", { useTz: true }).nullable();
    table.timestamp("created_at", { useTz: true }).notNullable().defaultTo(knex.fn.now());

    table.foreign("sender_user_id").references("id").inTable("users").onDelete("CASCADE");
    table.foreign("sender_admin_id").references("id").inTable("admins").onDelete("CASCADE");
    table.foreign("receiver_user_id").references("id").inTable("users").onDelete("CASCADE");
    table.foreign("receiver_admin_id").references("id").inTable("admins").onDelete("CASCADE");

    table.index("sender_user_id");
    table.index("sender_admin_id");
    table.index("receiver_user_id");
    table.index("receiver_admin_id");
    table.index(["receiver_user_id", "is_read", "created_at"]);
    table.index(["receiver_admin_id", "is_read", "created_at"]);
    table.index("notification_type");
    table.index("sent_at");
  });
}


export async function down(knex: Knex): Promise<void> {
  return knex.schema.dropTableIfExists("notifications");
}

