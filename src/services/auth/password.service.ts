import bcrypt from "bcryptjs";
import crypto from "crypto";

export class PasswordService {
    private static readonly SALT_ROUNDS = 10;

    /**
     * Hash a password using bcrypt
     */
    static async hashPassword(password: string): Promise<string> {
        return bcrypt.hash(password, this.SALT_ROUNDS);
    }

    /**
     * Verify a password against a hash
     */
    static async verifyPassword(password: string, hash: string): Promise<boolean> {
        return bcrypt.compare(password, hash);
    }

    /**
     * Generate a secure random token for password reset
     */
    static generateResetToken(): string {
        return crypto.randomBytes(32).toString("hex");
    }

    /**
     * Hash a reset token (for storage)
     */
    static hashToken(token: string): string {
        return crypto.createHash("sha256").update(token).digest("hex");
    }

    /**
     * Generate OTP (6 digits)
     */
    static generateOTP(): string {
        return Math.floor(100000 + Math.random() * 900000).toString();
    }

    /**
     * Hash OTP for storage
     */
    static hashOTP(otp: string): string {
        return crypto.createHash("sha256").update(otp).digest("hex");
    }

    /**
     * Verify OTP
     */
    static verifyOTP(otp: string, hash: string): boolean {
        const otpHash = this.hashOTP(otp);
        return otpHash === hash;
    }
}

