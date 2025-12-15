import type { Knex } from "knex";


export async function up(knex: Knex): Promise<void> {
  return knex.schema.createTable("private_chat_permissions", (table) => {
    table.increments("id").primary();
    table.integer("viewer_id").notNullable();
    table.integer("streamer_id").notNullable();
    table.string("unlock_method", 30).notNullable();
    table.decimal("total_tips_accumulated", 10, 2).defaultTo(0);
    table.timestamp("unlock_date", { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.boolean("is_active").defaultTo(true);
    table.timestamp("created_at", { useTz: true }).notNullable().defaultTo(knex.fn.now());

    table.index("viewer_id");
    table.index("streamer_id");
    table.index("is_active");
    table.unique(["viewer_id", "streamer_id"]);
  });
}


export async function down(knex: Knex): Promise<void> {
  return knex.schema.dropTableIfExists("private_chat_permissions");
}

