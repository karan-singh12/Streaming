import { Router } from "express";
import * as fxn from "../../controllers/admin/access-management/auth.controller";
import auth from "../../middleware/auth.middleware";

const router = Router();

// Note: addAdmin endpoint is not documented in Swagger as admins are created via database seeds
router.post("/addAdmin", fxn.addAdmin);

/**
 * @swagger
 * /api/admin/auth/login:
 *   post:
 *     summary: Admin login (sends OTP to email)
 *     tags: [Admin Panel - Authentication]
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
 *                 example: streamingadmin@getnada.com
 *               password:
 *                 type: string
 *                 format: password
 *                 example: Admin@123
 *     responses:
 *       200:
 *         description: OTP sent to email
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
 *                     otpRequired:
 *                       type: boolean
 *                     adminId:
 *                       type: string
 *       401:
 *         description: Invalid credentials
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post("/login", fxn.loginAdmin);

/**
 * @swagger
 * /api/admin/auth/verifyOTP:
 *   post:
 *     summary: Verify OTP and complete login
 *     description: Verify admin OTP code and complete login. Returns JWT token that can be used for authenticated admin requests.
 *     tags: [Admin Panel - Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email_address
 *               - otp
 *             properties:
 *               email_address:
 *                 type: string
 *                 format: email
 *                 example: "admin@streaminglive.com"
 *                 description: Admin email address (editable - click to change)
 *               otp:
 *                 type: string
 *                 example: "123456"
 *                 description: OTP code received via email (editable - click to change)
 *           examples:
 *             example1:
 *               summary: Verify OTP example
 *               value:
 *                 email_address: "admin@streaminglive.com"
 *                 otp: "123456"
 *     responses:
 *       200:
 *         description: Login successful, returns JWT token
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Login successful"
 *                 data:
 *                   type: object
 *                   properties:
 *                     token:
 *                       type: string
 *                       description: JWT token for authenticated admin requests
 *                       example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
 *                     result:
 *                       $ref: '#/components/schemas/Admin'
 *       400:
 *         description: Invalid or expired OTP
 *       401:
 *         description: Authentication failed
 */
router.post("/verifyOTP", fxn.verifyOTP);

/**
 * @swagger
 * /api/admin/auth/forgotPassword:
 *   post:
 *     summary: Request password reset
 *     tags: [Admin Panel - Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email_address
 *             properties:
 *               email_address:
 *                 type: string
 *                 format: email
 *     responses:
 *       200:
 *         description: Password reset email sent
 */
router.post("/forgotPassword", fxn.forgotPassword);

/**
 * @swagger
 * /api/admin/auth/resetPassword:
 *   post:
 *     summary: Reset password with token
 *     tags: [Admin Panel - Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - token
 *               - newPassword
 *             properties:
 *               token:
 *                 type: string
 *               newPassword:
 *                 type: string
 *                 format: password
 *     responses:
 *       200:
 *         description: Password reset successful
 */
router.post("/resetPassword", fxn.resetPassword);

/**
 * @swagger
 * /api/admin/auth/editProfile:
 *   post:
 *     summary: Update admin profile
 *     tags: [Admin Panel - Authentication]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               email_address:
 *                 type: string
 *                 format: email
 *     responses:
 *       200:
 *         description: Profile updated successfully
 */
router.post("/editProfile", auth, fxn.editProfile);

/**
 * @swagger
 * /api/admin/auth/getAdminDetails:
 *   get:
 *     summary: Get current admin details
 *     tags: [Admin Panel - Authentication]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Admin details
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/Admin'
 */
router.get("/getAdminDetails", auth, fxn.getAdminDetails);

/**
 * @swagger
 * /api/admin/auth/changePassword:
 *   post:
 *     summary: Change admin password
 *     tags: [Admin Panel - Authentication]
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
router.post("/changePassword", auth, fxn.changePassword);

/**
 * @swagger
 * /api/admin/auth/updateSetting:
 *   post:
 *     summary: Update admin settings
 *     tags: [Admin Panel - Authentication]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Settings updated successfully
 */
router.post("/updateSetting", auth, fxn.updateSetting);

/**
 * @swagger
 * /api/admin/auth/getSetting:
 *   get:
 *     summary: Get admin settings
 *     tags: [Admin Panel - Authentication]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Admin settings
 */
router.get("/getSetting", auth, fxn.getSetting);

/**
 * @swagger
 * /api/admin/auth/refreshToken:
 *   post:
 *     summary: Refresh access token
 *     tags: [Admin Panel - Authentication]
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
 * /api/admin/auth/logout:
 *   post:
 *     summary: Logout admin
 *     tags: [Admin Panel - Authentication]
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
