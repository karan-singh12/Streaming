import type { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
    // Add admin_id column to session_tracking if it doesn't exist
    const hasAdminId = await knex.schema.hasColumn("session_tracking", "admin_id");
    if (!hasAdminId) {
        // First, add the column
        await knex.schema.alterTable("session_tracking", (table) => {
            table.integer("admin_id").nullable();
        });

        // Then add foreign key
        await knex.schema.alterTable("session_tracking", (table) => {
            table.foreign("admin_id").references("id").inTable("admins").onDelete("CASCADE");
        });

        // Finally, add indexes
        await knex.schema.alterTable("session_tracking", (table) => {
            table.index("admin_id");
            table.index(["admin_id", "is_active"]);
        });
    }
}

export async function down(knex: Knex): Promise<void> {
    const hasAdminId = await knex.schema.hasColumn("session_tracking", "admin_id");
    if (hasAdminId) {
        // Drop foreign key first
        await knex.raw(`
      ALTER TABLE session_tracking 
      DROP CONSTRAINT IF EXISTS session_tracking_admin_id_foreign;
    `);

        // Drop indexes
        await knex.raw(`
      DROP INDEX IF EXISTS session_tracking_admin_id_index;
    `);
        await knex.raw(`
      DROP INDEX IF EXISTS session_tracking_admin_id_is_active_index;
    `);

        // Then drop column
        await knex.schema.alterTable("session_tracking", (table) => {
            table.dropColumn("admin_id");
        });
    }
}