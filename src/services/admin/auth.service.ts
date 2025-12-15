import { getDB } from "../../config/db.config";
import { PasswordService } from "../auth/password.service";

// Function to add a new admin
export const addAdminServices = async (name: string, email: string, password: string, role: string = "admin") => {
    const db = getDB();
    // Check if admin with the same email exists
    const existingAdmin = await db('admins')
        .where('email_address', email.toLowerCase())
        .first();
    
    if (existingAdmin) {
        throw new Error("Admin with this email already exists.");
    }

    // Hash the password
    const hashedPassword = await PasswordService.hashPassword(password);

    // Create a new admin
    const [admin] = await db('admins')
        .insert({
            name,
            email_address: email.toLowerCase(),
            password_hash: hashedPassword,
            role,
            status: 1, // 1 = active
            created_at: db.fn.now(),
            updated_at: db.fn.now()
        })
        .returning('*');

    // Return admin without password
    const { password_hash: _, ...adminWithoutPassword } = admin;
    return adminWithoutPassword;
};
