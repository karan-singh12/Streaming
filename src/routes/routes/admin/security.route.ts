import { Router } from "express";
import * as securityController from "../../controllers/admin/security-management/security.controller";
import auth from "../../middleware/auth.middleware";

const router = Router();

// All routes require authentication
router.use(auth);

/**
 * @swagger
 * /api/admin/security/alerts:
 *   get:
 *     summary: Get all security alerts
 *     tags: [Admin Panel - Security]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of security alerts
 */
router.get("/alerts", securityController.getAlerts as any);

/**
 * @swagger
 * /api/admin/security/alerts/statistics:
 *   get:
 *     summary: Get alert statistics
 *     tags: [Admin Panel - Security]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Alert statistics
 */
router.get("/alerts/statistics", securityController.getAlertStatistics as any);

/**
 * @swagger
 * /api/admin/security/alerts/{id}:
 *   get:
 *     summary: Get alert by ID
 *     tags: [Admin Panel - Security]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Alert details
 */
router.get("/alerts/:id", securityController.getAlertById as any);

/**
 * @swagger
 * /api/admin/security/alerts/{id}/acknowledge:
 *   put:
 *     summary: Acknowledge an alert
 *     tags: [Admin Panel - Security]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Alert acknowledged
 */
router.put("/alerts/:id/acknowledge", securityController.acknowledgeAlert as any);

/**
 * @swagger
 * /api/admin/security/alerts/resolve/{id}:
 *   get:
 *     summary: Resolve an alert
 *     tags: [Admin Panel - Security]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Alert resolved
 */
router.get("/alerts/resolve/:id", securityController.resolveAlert as any);

/**
 * @swagger
 * /api/admin/security/alerts/{id}/false-positive:
 *   put:
 *     summary: Mark alert as false positive
 *     tags: [Admin Panel - Security]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Alert marked as false positive
 */
router.put("/alerts/:id/false-positive", securityController.markAsFalsePositive as any);

/**
 * @swagger
 * /api/admin/security/traffic-logs:
 *   get:
 *     summary: Get traffic logs
 *     tags: [Admin Panel - Security]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Traffic logs
 */
router.get("/traffic-logs", securityController.getTrafficLogs as any);

/**
 * @swagger
 * /api/admin/security/traffic-statistics:
 *   get:
 *     summary: Get traffic statistics
 *     tags: [Admin Panel - Security]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Traffic statistics
 */
router.get("/traffic-statistics", securityController.getTrafficStatistics as any);

/**
 * @swagger
 * /api/admin/security/thresholds:
 *   get:
 *     summary: Get security thresholds
 *     tags: [Admin Panel - Security]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Security thresholds
 */
router.get("/thresholds", securityController.getThresholds as any);

/**
 * @swagger
 * /api/admin/security/thresholds:
 *   put:
 *     summary: Update security thresholds
 *     tags: [Admin Panel - Security]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               maxRequestsPerMinute:
 *                 type: number
 *               maxFailedLogins:
 *                 type: number
 *     responses:
 *       200:
 *         description: Thresholds updated
 */
router.put("/thresholds", securityController.updateThresholds as any);

/**
 * @swagger
 * /api/admin/security/block-ip:
 *   post:
 *     summary: Block an IP address
 *     tags: [Admin Panel - Security]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - ip
 *             properties:
 *               ip:
 *                 type: string
 *                 example: 192.168.1.1
 *               reason:
 *                 type: string
 *     responses:
 *       200:
 *         description: IP blocked successfully
 */
router.post("/block-ip", securityController.blockIP as any);

/**
 * @swagger
 * /api/admin/security/unblock-ip:
 *   post:
 *     summary: Unblock an IP address
 *     tags: [Admin Panel - Security]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - ip
 *             properties:
 *               ip:
 *                 type: string
 *     responses:
 *       200:
 *         description: IP unblocked successfully
 */
router.post("/unblock-ip", securityController.unblockIP as any);

/**
 * @swagger
 * /api/admin/security/blocked-ips:
 *   get:
 *     summary: Get list of blocked IPs
 *     tags: [Admin Panel - Security]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of blocked IPs
 */
router.get("/blocked-ips", securityController.getBlockedIPs as any);

/**
 * @swagger
 * /api/admin/security/ip/{ip}/details:
 *   get:
 *     summary: Get IP address details
 *     tags: [Admin Panel - Security]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: ip
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: IP address details
 */
router.get("/ip/:ip/details", securityController.getIPDetails as any);

/**
 * @swagger
 * /api/admin/security/dashboard:
 *   get:
 *     summary: Get security dashboard data
 *     tags: [Admin Panel - Security]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Security dashboard data
 */
router.get("/dashboard", securityController.getDashboardData as any);

export default router;
