import type { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable("site_settings", (table) => {
    table.increments("id").primary();
    table.string("setting_key", 100).unique().notNullable();
    table.text("setting_value").nullable();
    table.string("data_type", 20).notNullable();
    table.string("setting_group", 50).notNullable();
    table.text("description").nullable();
    table.boolean("is_public").notNullable().defaultTo(false);
    table.integer("updated_by").nullable();
    table.timestamp("created_at", { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.timestamp("updated_at", { useTz: true }).notNullable().defaultTo(knex.fn.now());

    table.index("setting_key");
    table.index("setting_group");
    table.index("is_public");
  });

  // Insert required keys only (empty values)
  await knex("site_settings").insert([
    {
      setting_key: "instagram",
      setting_value: "",
      data_type: "string",
      setting_group: "social",
      description: "Instagram URL",
      is_public: true
    },
    {
      setting_key: "facebook",
      setting_value: "",
      data_type: "string",
      setting_group: "social",
      description: "Facebook URL",
      is_public: true
    },
    {
      setting_key: "contactUsEmail",
      setting_value: "",
      data_type: "string",
      setting_group: "contact",
      description: "Contact email",
      is_public: true
    },
    {
      setting_key: "linkedin",
      setting_value: "",
      data_type: "string",
      setting_group: "social",
      description: "LinkedIn URL",
      is_public: true
    },
    {
      setting_key: "twitter",
      setting_value: "",
      data_type: "string",
      setting_group: "social",
      description: "Twitter URL",
      is_public: true
    }
  ]);
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists("site_settings");
}
