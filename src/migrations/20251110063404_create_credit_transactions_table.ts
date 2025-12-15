import type { Knex } from "knex";


export async function up(knex: Knex): Promise<void> {
  return knex.schema.createTable("credit_transactions", (table) => {
    table.increments("id").primary();
    table.integer("wallet_id").notNullable();
    table.string("transaction_type", 30).notNullable();
    table.decimal("amount", 14, 1).notNullable();
    table.decimal("balance_after", 14, 1).notNullable();
    table.text("description").nullable();
    table.integer("related_room_session_id").nullable();
    table.integer("related_tip_id").nullable();
    table.integer("related_payment_id").nullable();
    table.string("payment_gateway_ref", 255).nullable();
    table.timestamp("transaction_date", { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.timestamp("created_at", { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.string("idempotency_key", 255).unique().nullable();
    table.string("source", 50).notNullable().comment("tip|cam2cam|purchase|refund|chargeback|bonus");

    table.check("?? <> 0", ["amount"], "credit_transactions_amount_check");
    table.check("?? >= 0", ["balance_after"], "credit_transactions_balance_after_check");

    table.foreign("wallet_id").references("id").inTable("credit_wallets").onDelete("RESTRICT");
    table.index("wallet_id");
    table.index("transaction_type");
    table.index("transaction_date");
    table.index("related_room_session_id");
  });
}


export async function down(knex: Knex): Promise<void> {
  return knex.schema.dropTableIfExists("credit_transactions");
}

// import type { Knex } from "knex";

// export async function up(knex: Knex): Promise<void> {
//   // Update credit_wallets table
//   await knex.schema.alterTable("credit_wallets", (table) => {
//     table.decimal("balance", 14, 1).notNullable().defaultTo(0).alter();
//     table.check("?? >= 0", ["balance"], "credit_wallets_balance_check");
//   });

//   // Update credit_transactions table
//   await knex.schema.alterTable("credit_transactions", (table) => {
//     table.string("idempotency_key", 255).unique().nullable();
//     table.string("source", 50).notNullable().comment("tip|cam2cam|purchase|refund|chargeback|bonus");
    
//     table.check("?? <> 0", ["amount"], "credit_transactions_amount_check");
//     table.check("?? >= 0", ["balance_after"], "credit_transactions_balance_after_check");
    
//     table.foreign("wallet_id").references("id").inTable("credit_wallets").onDelete("RESTRICT");
//     table.index("wallet_id");
//     table.index("idempotency_key");
//     table.index(["wallet_id", "created_at"]);
//     table.index("source");
//   });
