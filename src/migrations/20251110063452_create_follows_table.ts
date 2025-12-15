import type { Knex } from "knex";


export async function up(knex: Knex): Promise<void> {
  return knex.schema.createTable("follows", (table) => {
    table.increments("id").primary();
    table.integer("follower_user_id").notNullable();
    table.integer("streamer_id").notNullable();
    table.timestamp("follow_date", { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.boolean("is_active").defaultTo(true);
    table.timestamp("created_at", { useTz: true }).notNullable().defaultTo(knex.fn.now());

    table.index("follower_user_id");
    table.index("streamer_id");
    table.index("is_active");
    table.unique(["follower_user_id", "streamer_id"]);
  });
}


export async function down(knex: Knex): Promise<void> {
  return knex.schema.dropTableIfExists("follows");
}

