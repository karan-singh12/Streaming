import jwt from "jsonwebtoken";
import crypto from "crypto";
import { getDB } from "../../config/db.config";
import { PasswordService } from "./password.service";

export interface TokenPayload {
    _id: string | number;
    jti?: string;
    type?: "access" | "refresh";
}

export class TokenService {
    /**
     * Generate JWT access token
     */
    static generateAccessToken(
        userId: string | number,
        secret: string,
        expiresIn: string
    ): { token: string; jti: string } {
        const jti = crypto.randomUUID();
        const payload = { _id: String(userId), jti, type: "access" };
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const token = jwt.sign(payload, secret as any, { expiresIn } as any);
        return { token, jti };
    }

    /**
     * Generate refresh token
     */
    static generateRefreshToken(): { token: string; jti: string; hash: string } {
        const jti = crypto.randomUUID();
        const token = crypto.randomBytes(32).toString("hex");
        const hash = PasswordService.hashToken(token);
        return { token, jti, hash };
    }

    /**
     * Store refresh token in database
     */
    static async storeRefreshToken(
        userId: number | null,
        adminId: number | null,
        jti: string,
        tokenHash: string,
        expiresAt: Date,
        ip?: string,
        userAgent?: string
    ): Promise<void> {
        const db = getDB();
        await db("refresh_tokens").insert({
            user_id: userId,
            admin_id: adminId,
            jti,
            token_hash: tokenHash,
            expires_at: expiresAt,
            ip_address: ip,
            user_agent: userAgent,
            is_active: true,
            created_at: db.fn.now(),
        });
    }

    /**
     * Revoke a token by JTI
     */
    static async revokeToken(
        jti: string,
        userId?: number,
        adminId?: number,
        revokedBy?: { userId?: number; adminId?: number },
        reason?: string
    ): Promise<void> {
        const db = getDB();

        // Get token to find expiry
        const token = await db("refresh_tokens")
            .where("jti", jti)
            .where("is_active", true)
            .first();

        if (token) {
            // Mark as inactive
            await db("refresh_tokens")
                .where("jti", jti)
                .update({ is_active: false });

            // Add to revoked tokens
            await db("revoked_tokens").insert({
                jti,
                user_id: userId || token.user_id,
                admin_id: adminId || token.admin_id,
                revoked_at: db.fn.now(),
                revoked_by_user_id: revokedBy?.userId,
                revoked_by_admin_id: revokedBy?.adminId,
                reason: reason || "User logout",
                expires_at: token.expires_at,
            });

            // Update session tracking
            await db("session_tracking")
                .where("refresh_token_jti", jti)
                .update({ is_active: false, updated_at: db.fn.now() });
        }
    }

    /**
     * Revoke all tokens for a user
     */
    static async revokeAllUserTokens(
        userId: number,
        reason: string = "Password changed or account security"
    ): Promise<void> {
        const db = getDB();

        // Get all active tokens
        const tokens = await db("refresh_tokens")
            .where("user_id", userId)
            .where("is_active", true);

        for (const token of tokens) {
            await this.revokeToken(
                token.jti,
                userId,
                undefined,
                { userId },
                reason
            );
        }

        // Update all sessions
        await db("session_tracking")
            .where("user_id", userId)
            .update({ is_active: false, updated_at: db.fn.now() });
    }

    /**
     * Revoke all tokens for an admin
     */
    static async revokeAllAdminTokens(
        adminId: number,
        reason: string = "Password changed or account security"
    ): Promise<void> {
        const db = getDB();

        // Get all active tokens
        const tokens = await db("refresh_tokens")
            .where("admin_id", adminId)
            .where("is_active", true);

        for (const token of tokens) {
            await this.revokeToken(
                token.jti,
                undefined,
                adminId,
                { adminId },
                reason
            );
        }
    }

    /**
     * Check if token is revoked
     */
    static async isTokenRevoked(jti: string): Promise<boolean> {
        const db = getDB();
        const revoked = await db("revoked_tokens")
            .where("jti", jti)
            .first();
        return !!revoked;
    }

    /**
     * Verify refresh token
     */
    static async verifyRefreshToken(
        token: string,
        jti: string
    ): Promise<boolean> {
        const db = getDB();

        // Check if revoked
        if (await this.isTokenRevoked(jti)) {
            return false;
        }

        // Get token from DB
        const storedToken = await db("refresh_tokens")
            .where("jti", jti)
            .where("is_active", true)
            .first();

        if (!storedToken) {
            return false;
        }

        // Check expiry
        if (new Date(storedToken.expires_at) < new Date()) {
            return false;
        }

        // Verify token hash
        const tokenHash = PasswordService.hashToken(token);
        return tokenHash === storedToken.token_hash;
    }

    /**
     * Rotate refresh token (revoke old, create new)
     */
    static async rotateRefreshToken(
        oldJti: string,
        userId: number | null,
        adminId: number | null,
        ip?: string,
        userAgent?: string
    ): Promise<{ token: string; jti: string }> {
        // Revoke old token
        await this.revokeToken(
            oldJti,
            userId || undefined,
            adminId || undefined,
            { userId: userId || undefined, adminId: adminId || undefined },
            "Token rotation"
        );

        // Generate new token
        const { token, jti, hash } = this.generateRefreshToken();
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 30); // 30 days

        await this.storeRefreshToken(
            userId,
            adminId,
            jti,
            hash,
            expiresAt,
            ip,
            userAgent
        );

        return { token, jti };
    }
}