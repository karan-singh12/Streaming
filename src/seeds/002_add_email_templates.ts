import type { Knex } from "knex";
import * as dotenv from "dotenv";

// Load environment variables
dotenv.config();

export async function seed(knex: Knex): Promise<void> {
  // Define email templates based on environment variables
  const emailTemplates = [
    {
      envVar: "FORGOT_PASSWORD_ADMIN",
      defaultSlug: "forgot_password_admin",
      title: "Admin Forgot Password",
      subject: "Reset Your Admin Password",
      content: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Password Reset Request</h2>
          <p>Hello {adminName},</p>
          <p>You have requested to reset your password. Please click on the link below to reset your password:</p>
          <p><a href="{resetLink}" style="background-color: #4CAF50; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">Reset Password</a></p>
          <p>If you did not request this password reset, please ignore this email.</p>
          <p>Best regards,<br>streaming Team</p>
        </div>
      `,
    },
    {
      envVar: "FORGOT_PASSWORD_USER",
      defaultSlug: "forgot_password_user",
      title: "User Forgot Password",
      subject: "Reset Your Password - OTP",
      content: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Password Reset OTP</h2>
          <p>Hello,</p>
          <p>You have requested to reset your password. Please use the following OTP to reset your password:</p>
          <div style="background-color: #f4f4f4; padding: 20px; text-align: center; margin: 20px 0;">
            <h1 style="color: #4CAF50; margin: 0;">{otp}</h1>
          </div>
          <p>This OTP will expire in {otpExpire} minutes.</p>
          <p>If you did not request this password reset, please ignore this email.</p>
          <p>Best regards,<br>streaming Team</p>
        </div>
      `,
    },
    {
      envVar: "VERIFY_ACCOUNT_USER",
      defaultSlug: "verify_account_user",
      title: "User Account Verification",
      subject: "Verify Your Account",
      content: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Welcome {User}!</h2>
          <p>Thank you for registering with us. Please verify your account by clicking on the link below:</p>
          <p><a href="{link}" style="background-color: #4CAF50; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">Verify Account</a></p>
          <p>If you did not create an account, please ignore this email.</p>
          <p>Best regards,<br>streaming Team</p>
        </div>
      `,
    },
    {
      envVar: "USER_SEND_PASSWORD",
      defaultSlug: "user_send_password",
      title: "User Password Notification",
      subject: "Your Account Credentials",
      content: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Welcome {username}!</h2>
          <p>Your account has been created successfully. Here are your login credentials:</p>
          <div style="background-color: #f4f4f4; padding: 15px; margin: 20px 0;">
            <p><strong>Email:</strong> {email}</p>
            <p><strong>Password:</strong> {password}</p>
          </div>
          <p>Please keep these credentials safe and change your password after your first login.</p>
          <p>Best regards,<br>streaming Team</p>
        </div>
      `,
      // Note: This template supports both {username} and {name} placeholders
      // for compatibility with different controllers
    },
  ];

  // Process each template
  for (const template of emailTemplates) {
    // Get slug from environment variable or use default
    const slug = process.env[template.envVar] || template.defaultSlug;

    // Check if template already exists
    const existingTemplate = await knex("email_templates")
      .where("slug", slug)
      .first();

    if (existingTemplate) {
      console.log(
        `Email template "${template.title}" (${slug}) already exists, skipping...`
      );
      continue;
    }

    // Insert new template
    await knex("email_templates").insert({
      title: template.title,
      slug: slug,
      subject: template.subject,
      content: template.content.trim(),
      status: 1, // 1 = active
      created_by: null, // Seed data, no specific creator
      created_at: knex.fn.now(),
      modified_at: knex.fn.now(),
    });

    console.log(
      `Email template "${template.title}" (${slug}) created successfully!`
    );
  }

  console.log("Email templates seed completed successfully!");
}
