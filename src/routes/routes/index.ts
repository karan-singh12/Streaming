import { Router } from "express";
import adminRouter from "./admin";
import userRouter from "./user";
import * as healthController from "../controllers/admin/security-management/health.controller";
import streamerRouter from "./streamer";

const router = Router();

/**
 * @swagger
 * /api/health:
 *   get:
 *     summary: Simple health check
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: Service is healthy
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: "ok"
 */
router.get("/health", healthController.simpleHealthCheck as any);

/**
 * @swagger
 * /api/health/detailed:
 *   get:
 *     summary: Detailed health check with system information
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: Detailed health status
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                 database:
 *                   type: object
 *                 uptime:
 *                   type: number
 */
router.get("/health/detailed", healthController.healthCheck as any);

router.use("/admin", adminRouter);

router.use("/user", userRouter);

router.use("/streamer", streamerRouter);

export default router;