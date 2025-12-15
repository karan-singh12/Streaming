import type { Knex } from "knex";


export async function up(knex: Knex): Promise<void> {
  return knex.schema.createTable("chat_messages", (table) => {
    table.increments("id").primary();
    table.integer("room_session_id").nullable();
    table.integer("sender_user_id").notNullable();
    table.integer("receiver_user_id").nullable();
    table.string("chat_type", 20).notNullable();
    table.text("message_content").notNullable();
    table.boolean("is_emoji").defaultTo(false);
    table.timestamp("sent_at", { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.timestamp("created_at", { useTz: true }).notNullable().defaultTo(knex.fn.now());

    table.index("room_session_id");
    table.index("sender_user_id");
    table.index("receiver_user_id");
    table.index("chat_type");
    table.index("sent_at");
  });
}


export async function down(knex: Knex): Promise<void> {
  return knex.schema.dropTableIfExists("chat_messages");
}

