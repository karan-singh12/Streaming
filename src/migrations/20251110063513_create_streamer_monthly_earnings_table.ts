import type { Knex } from "knex";


export async function up(knex: Knex): Promise<void> {
  return knex.schema.createTable("streamer_monthly_earnings", (table) => {
    table.increments("id").primary();
    table.integer("streamer_id").notNullable();
    table.integer("year").notNullable();
    table.integer("month").notNullable();
    table.decimal("total_credits_earned", 12, 2).notNullable().defaultTo(0);
    table.decimal("pyramid_credits", 12, 2).defaultTo(0);
    table.decimal("cam2cam_credits", 12, 2).defaultTo(0);
    table.decimal("tip_credits", 12, 2).defaultTo(0);
    table.integer("total_pyramid_minutes").defaultTo(0);
    table.integer("total_cam2cam_sessions").defaultTo(0);
    table.integer("total_tips_received").defaultTo(0);
    table.integer("traffic_rank").nullable();
    table.timestamp("settlement_date", { useTz: true }).nullable();
    table.boolean("is_settled").defaultTo(false);
    table.timestamp("created_at", { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.timestamp("updated_at", { useTz: true }).notNullable().defaultTo(knex.fn.now());

    table.index("streamer_id");
    table.index(["year", "month"]);
    table.index("traffic_rank");
    table.index("is_settled");
    table.unique(["streamer_id", "year", "month"]);
  });
}


export async function down(knex: Knex): Promise<void> {
  return knex.schema.dropTableIfExists("streamer_monthly_earnings");
}

