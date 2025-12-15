import type { Knex } from "knex";
import bcrypt from "bcryptjs";

export async function seed(knex: Knex): Promise<void> {
  const existingAdmin = await knex("admins")
    .where("email_address", "streamingadmin@getnada.com")
    .first();

  if (existingAdmin) {
    console.log("Admin already exists, skipping seed...");
    return;
  }

  // Hash password
  const hashedPassword = await bcrypt.hash("Admin123", 10);

  await knex("admins").insert({
    name: "Admin",
    email_address: "streamingadmin@getnada.com",
    password_hash: hashedPassword,
    role: "admin",
    status: 1,
    created_at: new Date(),
    updated_at: new Date(),
  });

  console.log("Admin seed completed successfully!");
}
