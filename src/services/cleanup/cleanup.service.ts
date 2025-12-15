import { getDB } from "../../config/db.config";
import { log } from "../../utils/logger";

export class CleanupService {

  static async cleanupExpiredRefreshTokens(): Promise<number> {
    const db = getDB();
    const result = await db("refresh_tokens")
      .where("expires_at", "<", db.fn.now())
      .orWhere("is_active", false)
      .delete();

    log(`Cleaned up ${result} expired/inactive refresh tokens`);
    return result;
  }


  static async cleanupOldRevokedTokens(retentionDays: number = 90): Promise<number> {
    const db = getDB();
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

    const result = await db("revoked_tokens")
      .where("revoked_at", "<", cutoffDate)
      .delete();

    log(`Cleaned up ${result} old revoked tokens (older than ${retentionDays} days)`);
    return result;
  }


  static async cleanupStaleSessions(retentionDays: number = 30): Promise<number> {
    const db = getDB();
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

    const result = await db("session_tracking")
      .where("is_active", false)
      .where("updated_at", "<", cutoffDate)
      .delete();

    log(`Cleaned up ${result} stale sessions (older than ${retentionDays} days)`);
    return result;
  }


  static async cleanupExpiredMFAChallenges(): Promise<number> {
    const db = getDB();
    const result = await db("mfa_challenges")
      .where("expires_at", "<", db.fn.now())
      .delete();

    log(`Cleaned up ${result} expired MFA challenges`);
    return result;
  }


  static async runAllCleanupTasks(): Promise<void> {
    try {
      await this.cleanupExpiredRefreshTokens();
      await this.cleanupOldRevokedTokens(90);
      await this.cleanupStaleSessions(30);
      await this.cleanupExpiredMFAChallenges();
      log("All cleanup tasks completed successfully");
    } catch (error: any) {
      log(`Cleanup error: ${error.message}`);
      throw error;
    }
  }
}

