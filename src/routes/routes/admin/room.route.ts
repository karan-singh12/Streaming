import { Router } from 'express';
import auth from '../../middleware/auth.middleware';
import { validate } from '../../middleware/joiValidation.middleware';
import * as pyramidController from '../../controllers/admin/stream-management/pyramid.controller';
import * as cam2camController from '../../controllers/admin/stream-management/cam2cam.controller';
import {
    updatePyramidRoomSchema,
} from '../../validators/Admin/pyramid.validator';
import {
    getAllCam2CamRoomsSchema,
    updateCam2CamPricingSchema,
} from '../../validators/Admin/cam2cam.validator';

const router = Router();

/**
 * @swagger
 * /api/admin/room/pyramid/getAllRooms:
 *   get:
 *     summary: Get all pyramid rooms (all 10 rooms)
 *     tags: [Admin Panel - Room Management]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of all pyramid rooms
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     rooms:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: number
 *                           roomPosition:
 *                             type: number
 *                           roomStatus:
 *                             type: string
 *                             enum: [Active, Inactive]
 *                           nickname:
 *                             type: string
 *                             nullable: true
 *                           pinned:
 *                             type: string
 *                             enum: [YES, NO]
 *                           createdAt:
 *                             type: string
 *                             format: date-time
 *                             nullable: true
 *                           feeRate:
 *                             type: number
 *                           currentStreamerId:
 *                             type: number
 *                             nullable: true
 *                     total:
 *                       type: number
 */
router.get('/pyramid/getAllRooms', auth, pyramidController.getAllPyramidRooms);

/**
 * @swagger
 * /api/admin/room/pyramid/updateRoom:
 *   post:
 *     summary: Update pyramid room settings (billing rate and/or pin status)
 *     tags: [Admin Panel - Room Management]
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
 *                 type: number
 *               billingRatePerMinute:
 *                 type: number
 *                 minimum: 0.01
 *                 description: Per-minute billing rate
 *               isPinned:
 *                 type: boolean
 *                 description: Pin room to top (unpins all other rooms if true)
 *     responses:
 *       200:
 *         description: Room updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: number
 *                     roomPosition:
 *                       type: number
 *                     roomStatus:
 *                       type: string
 *                     nickname:
 *                       type: string
 *                       nullable: true
 *                     pinned:
 *                       type: string
 *                     createdAt:
 *                       type: string
 *                       nullable: true
 *                     feeRate:
 *                       type: number
 *                     currentStreamerId:
 *                       type: number
 *                       nullable: true
 */
router.post('/pyramid/updateRoom', validate(updatePyramidRoomSchema, 'body'), auth, pyramidController.updatePyramidRoom);

/**
 * @swagger
 * /api/admin/room/cam2cam/getAllRooms:
 *   post:
 *     summary: Get all Cam2Cam rooms with pagination and search
 *     tags: [Admin Panel - Room Management]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               pageNumber:
 *                 type: number
 *                 default: 1
 *                 minimum: 1
 *               pageSize:
 *                 type: number
 *                 default: 10
 *                 minimum: 1
 *                 maximum: 100
 *               searchItem:
 *                 type: string
 *                 description: Search by ID#, Nickname, or Email Address
 *     responses:
 *       200:
 *         description: List of Cam2Cam rooms
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     result:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: number
 *                           uniqueId:
 *                             type: string
 *                             description: Streamer ID#
 *                           emailAddress:
 *                             type: string
 *                           nickname:
 *                             type: string
 *                           duration15Min:
 *                             type: number
 *                           duration30Min:
 *                             type: number
 *                           duration45Min:
 *                             type: number
 *                           duration60Min:
 *                             type: number
 *                     totalRecords:
 *                       type: number
 *                     pageNumber:
 *                       type: number
 *                     pageSize:
 *                       type: number
 */
router.post('/cam2cam/getAllRooms', validate(getAllCam2CamRoomsSchema, 'body'), auth, cam2camController.getAllCam2CamRooms);

/**
 * @swagger
 * /api/admin/room/cam2cam/updatePricing:
 *   post:
 *     summary: Update Cam2Cam pricing for a streamer
 *     tags: [Admin Panel - Room Management]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - streamerId
 *             properties:
 *               streamerId:
 *                 type: number
 *               duration15Min:
 *                 type: number
 *                 minimum: 0.01
 *               duration30Min:
 *                 type: number
 *                 minimum: 0.01
 *               duration45Min:
 *                 type: number
 *                 minimum: 0.01
 *               duration60Min:
 *                 type: number
 *                 minimum: 0.01
 *     responses:
 *       200:
 *         description: Cam2Cam pricing updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: number
 *                     uniqueId:
 *                       type: string
 *                     emailAddress:
 *                       type: string
 *                     nickname:
 *                       type: string
 *                     duration15Min:
 *                       type: number
 *                     duration30Min:
 *                       type: number
 *                     duration45Min:
 *                       type: number
 *                     duration60Min:
 *                       type: number
 */
router.post('/cam2cam/updatePricing', validate(updateCam2CamPricingSchema, 'body'), auth, cam2camController.updateCam2CamPricing);

export default router;