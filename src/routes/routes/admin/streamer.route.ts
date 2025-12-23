import { Router } from 'express'
import auth from "../../middleware/auth.middleware";
import * as fxn from '../../controllers/admin/access-management/streamer.controller';
import upload from '../../middleware/uploads.middleware';
const router = Router()

/**
 * @swagger
 * /api/admin/streamer/addStreamer:
 *   post:
 *     summary: Create a new streamer
 *     tags: [Admin Panel - Streamer Management]
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
 *             required:
 *               - email_address
 *               - password
 *             properties:
 *               email_address:
 *                 type: string
 *                 format: email
 *               password:
 *                 type: string
 *                 format: password
 *               nickname:
 *                 type: string
 *               avatar:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: Streamer created successfully
 */
router.post('/addStreamer', upload.single('avatar'), auth, fxn.addStreamer);

/**
 * @swagger
 * /api/admin/streamer/getAllStreamer:
 *   post:
 *     summary: Get all streamers with pagination and filters
 *     tags: [Admin Panel - Streamer Management]
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
 *                 example: 1
 *               pageSize:
 *                 type: number
 *                 example: 10
 *               searchItem:
 *                 type: string
 *               status:
 *                 type: array
 *                 items:
 *                   type: number
 *                 example: [0, 1]
 *     responses:
 *       200:
 *         description: List of streamers
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
 *                         $ref: '#/components/schemas/Streamer'
 *                     totalRecords:
 *                       type: number
 *                     pageNumber:
 *                       type: number
 *                     pageSize:
 *                       type: number
 */
router.post('/getAllStreamer', auth, fxn.getAllStreamers);

/**
 * @swagger
 * /api/admin/streamer/getOneStreamer/{id}:
 *   get:
 *     summary: Get streamer by ID
 *     tags: [Admin Panel - Streamer Management]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Streamer details
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/Streamer'
 */
router.get('/getOneStreamer/:id', auth, fxn.getOneStreamer);

/**
 * @swagger
 * /api/admin/streamer/updateStreamer:
 *   post:
 *     summary: Update streamer information
 *     tags: [Admin Panel - Streamer Management]
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
 *             required:
 *               - id
 *             properties:
 *               id:
 *                 type: number
 *               status:
 *                 type: number
 *               age:
 *                 type: number
 *               height:
 *                 type: string
 *               weight:
 *                 type: string
 *               nationality:
 *                 type: string
 *               languages:
 *                 type: string
 *               avatar:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: Streamer updated successfully
 */
router.post('/updateStreamer', upload.single('avatar'), auth, fxn.updateStreamer);

/**
 * @swagger
 * /api/admin/streamer/changeStatus:
 *   post:
 *     summary: Change streamer status
 *     tags: [Admin Panel - Streamer Management]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - id
 *               - status
 *             properties:
 *               id:
 *                 type: number
 *               status:
 *                 type: number
 *                 enum: [0, 1, 2]
 *     responses:
 *       200:
 *         description: Streamer status updated successfully
 */
router.post('/changeStatus', auth, fxn.changeStatus);

/**
 * @swagger
 * /api/admin/streamer/deleteStreamer:
 *   post:
 *     summary: Delete streamer (soft delete)
 *     tags: [Admin Panel - Streamer Management]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - id
 *             properties:
 *               id:
 *                 type: number
 *     responses:
 *       200:
 *         description: Streamer deleted successfully
 */
router.post('/deleteStreamer', auth, fxn.deleteStreamer);

/**
 * @swagger
 * /api/admin/streamer/verifyStreamer:
 *   post:
 *     summary: Verify streamer
 *     tags: [Admin Panel - Streamer Management]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - id
 *             properties:
 *               id:
 *                 type: number
 *               isVerified:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Streamer verification updated
 */
router.post('/verifyStreamer', auth, fxn.verifyStreamer);

/**
 * @swagger
 * /api/admin/streamer/updatePassword:
 *   post:
 *     summary: Update streamer password
 *     tags: [Admin Panel - Streamer Management]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - id
 *               - newPassword
 *               - confirmPassword
 *             properties:
 *               id:
 *                 type: number
 *               newPassword:
 *                 type: string
 *                 format: password
 *               confirmPassword:
 *                 type: string
 *                 format: password
 *     responses:
 *       200:
 *         description: Password updated successfully
 */
router.post('/updatePassword', auth, fxn.updateStreamerPassword);

export default router;