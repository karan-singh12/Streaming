import type { Knex } from "knex";


export async function up(knex: Knex): Promise<void> {
  return knex.schema.createTable("streamer_daily_stats", (table) => {
    table.increments("id").primary();
    table.integer("streamer_id").notNullable();
    table.date("stat_date").notNullable();
    table.integer("total_online_minutes").defaultTo(0);
    table.integer("total_pyramid_minutes").defaultTo(0);
    table.integer("total_cam2cam_sessions").defaultTo(0);
    table.integer("total_tips_received").defaultTo(0);
    table.decimal("credits_earned_pyramid", 10, 2).defaultTo(0);
    table.decimal("credits_earned_cam2cam", 10, 2).defaultTo(0);
    table.decimal("credits_earned_tips", 10, 2).defaultTo(0);
    table.decimal("total_credits_earned", 10, 2).defaultTo(0);
    table.integer("unique_viewers").defaultTo(0);
    table.integer("new_followers").defaultTo(0);
    table.timestamp("created_at", { useTz: true }).notNullable().defaultTo(knex.fn.now());

    table.index("streamer_id");
    table.index("stat_date");
    table.unique(["streamer_id", "stat_date"]);
  });
}


export async function down(knex: Knex): Promise<void> {
  return knex.schema.dropTableIfExists("streamer_daily_stats");
}

