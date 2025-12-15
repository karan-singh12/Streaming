import { getDB } from "../../config/db.config";
import crypto from "crypto";

export class SessionService {
    /**
     * Generate a unique session token
     */
    private static generateSessionToken(): string {
        return crypto.randomBytes(32).toString("hex");
    }

    /**
     * Create or update session tracking
     */
    static async trackSession(
        userId: number | null,
        adminId: number | null,
        ip: string,
        userAgent: string,
        refreshTokenJti?: string
    ): Promise<{ sessionId: number; sessionToken: string }> {
        const db = getDB();
        const sessionToken = this.generateSessionToken();

        const sessionData: any = {
            user_id: userId,
            admin_id: adminId,
            session_token: sessionToken,
            ip_address: ip,
            user_agent: userAgent,
            login_at: db.fn.now(),
            last_activity_at: db.fn.now(),
            is_active: true,
            created_at: db.fn.now(),
            updated_at: db.fn.now(),
        };

        if (refreshTokenJti) {
            sessionData.refresh_token_jti = refreshTokenJti;
        }

        const [session] = await db("session_tracking")
            .insert(sessionData)
            .returning("id");

        return { sessionId: session.id, sessionToken };
    }

    /**
     * Update last activity
     */
    static async updateActivity(sessionId: number): Promise<void> {
        const db = getDB();
        await db("session_tracking")
            .where("id", sessionId)
            .update({
                last_activity_at: db.fn.now(),
                updated_at: db.fn.now(),
            });
    }

    /**
     * End session
     */
    static async endSession(sessionId: number): Promise<void> {
        const db = getDB();
        await db("session_tracking")
            .where("id", sessionId)
            .update({
                logout_at: db.fn.now(),
                is_active: false,
                updated_at: db.fn.now(),
            });
    }

    /**
     * End all active sessions for a user
     */
    static async endAllUserSessions(userId: number): Promise<void> {
        const db = getDB();
        await db("session_tracking")
            .where("user_id", userId)
            .where("is_active", true)
            .update({
                logout_at: db.fn.now(),
                is_active: false,
                updated_at: db.fn.now(),
            });
    }
}

