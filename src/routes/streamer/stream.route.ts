import { Router } from "express";
import * as fxn from "../../controllers/streamer/stream-api/streaming.controller";
import auth from "../../middleware/auth.middleware";
import upload from "../../middleware/uploads.middleware";

const router = Router();

/**
 * @swagger
 * /api/user/auth/login:
 *   post:
 *     summary: User login
 *     tags: [User - Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email_address
 *               - password
 *             properties:
 *               email_address:
 *                 type: string
 *                 format: email
 *                 example: "user@example.com"
 *               password:
 *                 type: string
 *                 format: password
 *     responses:
 *       200:
 *         description: Login successful, returns JWT token
 *       401:
 *         description: Invalid credentials
 */
router.post("/startStream", auth, fxn.startStream);

/**
 * @swagger
 * /api/streamer/stream/reconnectStream:
 *   post:
 *     summary: Reconnect to an existing active stream
 *     tags: [Streamer - Streaming]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - streamerName
 *             properties:
 *               streamerName:
 *                 type: string
 *                 description: Stream name/key for reconnection
 *     responses:
 *       200:
 *         description: Successfully reconnected to stream
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     roomId:
 *                       type: integer
 *                     room_position:
 *                       type: integer
 *                     streamKey:
 *                       type: string
 *                     publisherData:
 *                       type: object
 *                     type:
 *                       type: string
 *                     billingRatePerMin:
 *                       type: number
 *                     status:
 *                       type: string
 *       400:
 *         description: No active stream found or invalid request
 *       401:
 *         description: Unauthorized
 */
router.post("/reconnectStream", auth, fxn.reconnectStream);

/**
 * @swagger
 * /api/user/auth/editProfile:
 *   post:
 *     summary: Update user profile
 *     tags: [User Panel - Profile]
 *     security:
 *       - bearerAuth: []
 *     consumes:
 *       - multipart/form-data
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               nickname:
 *                 type: string
 *               images:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: binary
 *     responses:
 *       200:
 *         description: Profile updated successfully
 */
router.post('/endStream', auth, fxn.endStream);

export default router;