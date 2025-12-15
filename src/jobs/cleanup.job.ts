import { CleanupService } from "../services/cleanup/cleanup.service";
import { log } from "../utils/logger";


export const startCleanupJob = (): void => {
    try {
        const cron = require("node-cron");

        // Run daily at 2:00 AM
        cron.schedule("0 2 * * *", async () => {
            try {
                await CleanupService.runAllCleanupTasks();
                log("Scheduled cleanup job completed successfully");
            } catch (error: any) {
                log(`Scheduled cleanup job failed: ${error.message}`);
            }
        });

    } catch (error) {
        log("node-cron not installed. Cleanup job not scheduled automatically.");
        log("Install with: npm install node-cron @types/node-cron");
        log("Or run cleanup manually via API endpoint or cron job manager");
    }
};

