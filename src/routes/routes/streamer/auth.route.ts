import { Router } from "express";
import * as fxn from "../../controllers/streamer/auth-api/auth.controller";
import auth from "../../middleware/auth.middleware";
import upload from "../../middleware/uploads.middleware";
import { validate } from "../../middleware/joiValidation.middleware";
import { streamerLoginSchema, streamerEditProfileSchema, streamerChangePasswordSchema } from "../../validators/Streamer/auth.validator";

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
router.post("/login", validate(streamerLoginSchema), fxn.loginStreamer);

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
router.post('/editProfile', auth, validate(streamerEditProfileSchema), upload.fields([
    { name: 'avatar', maxCount: 1 },
    { name: 'thumbnail', maxCount: 1 }
]), fxn.editProfile);

/**
 * @swagger
 * /api/user/auth/getUserDetails:
 *   get:
 *     summary: Get current user details
 *     tags: [User Panel - Profile]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User details
 */
router.get("/getUserDetails", auth, fxn.getUserDetails);

/**
 * @swagger
 * /api/user/auth/changePassword:
 *   post:
 *     summary: Change user password
 *     tags: [User Panel - Authentication]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - currentPassword
 *               - newPassword
 *             properties:
 *               currentPassword:
 *                 type: string
 *                 format: password
 *               newPassword:
 *                 type: string
 *                 format: password
 *     responses:
 *       200:
 *         description: Password changed successfully
 */
router.post("/changePassword", auth, validate(streamerChangePasswordSchema), fxn.changePassword);

/**
 * @swagger
 * /api/streamer/auth/refreshToken:
 *   post:
 *     summary: Refresh access token
 *     tags: [Streamer - Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - refreshToken
 *             properties:
 *               refreshToken:
 *                 type: string
 *     responses:
 *       200:
 *         description: New access and refresh tokens
 */
router.post("/refreshToken", fxn.refreshToken);

/**
 * @swagger
 * /api/streamer/auth/logout:
 *   post:
 *     summary: Logout streamer
 *     tags: [Streamer - Authentication]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               refreshToken:
 *                 type: string
 *     responses:
 *       200:
 *         description: Logged out successfully
 */
router.post("/logout", auth, fxn.logout);

export default router;