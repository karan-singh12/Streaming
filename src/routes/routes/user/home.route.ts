import { Router } from "express";
import * as fxn from "../../controllers/user/home-api/home.controller";
import auth from "../../middleware/auth.middleware";

const router = Router();

/**
 * @swagger
 * /api/user/home/pyramid-rooms:
 *   get:
 *     summary: Get all active pyramid rooms with streamer details
 *     tags: [User - Home]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of active pyramid rooms
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
 *                     rooms:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: integer
 *                           room_position:
 *                             type: integer
 *                           room_status:
 *                             type: integer
 *                           is_pinned:
 *                             type: boolean
 *                           billing_rate_per_minute:
 *                             type: number
 *                           current_streamer:
 *                             type: object
 *                             nullable: true
 *                             properties:
 *                               streamer_id:
 *                                 type: integer
 *                               unique_id:
 *                                 type: string
 *                               email_address:
 *                                 type: string
 *                               nickname:
 *                                 type: string
 *                               avatar:
 *                                 type: string
 *                     total:
 *                       type: integer
 *       401:
 *         description: Unauthorized
 */
router.get("/pyramidRooms", fxn.pyramidRooms);

/**
 * @swagger
 * /api/user/home/join-stream:
 *   post:
 *     summary: Join a stream (pyramid or cam2cam)
 *     tags: [User - Home]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - roomId
 *             properties:
 *               roomId:
 *                 type: integer
 *                 description: Pyramid room ID or streamer ID for cam2cam
 *               packageType:
 *                 type: string
 *                 default: pyramid_minute
 *                 description: Package type for cam2cam (e.g., cam2cam_15_min, cam2cam_30_min)
 *     responses:
 *       200:
 *         description: Successfully joined stream
 *       400:
 *         description: Bad request
 *       401:
 *         description: Unauthorized
 */
router.post("/join-stream", auth, fxn.joinStream);

/**
 * @swagger
 * /api/user/home/top-streamers:
 *   get:
 *     summary: Get top 10 streamers by monthly traffic
 *     tags: [User - Home]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Top 10 streamers by monthly traffic
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
 *                     streamers:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: integer
 *                           uniqueId:
 *                             type: string
 *                           nickname:
 *                             type: string
 *                           avatar:
 *                             type: string
 *                           thumbnail:
 *                             type: string
 *                           themeDescription:
 *                             type: string
 *                           isOnline:
 *                             type: boolean
 *                           monthlyTraffic:
 *                             type: integer
 *                             description: Number of room sessions in current month
 *                     total:
 *                       type: integer
 *                     month:
 *                       type: string
 *       401:
 *         description: Unauthorized
 */
router.get("/top-streamers", fxn.getTopStreamersByTraffic);

router.post("/cam2camRooms", fxn.cam2camRooms);

router.get("/pyramidRoom/:roomId", auth, fxn.getPyramidRoomDetails);

router.get("/cam2camRoom/:roomId", auth, fxn.getRoomSessionDetails);

export default router;

