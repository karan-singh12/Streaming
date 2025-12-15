import { Router } from "express";
import * as fxn from "../../controllers/user/auth-api/auth.controller";
import auth from "../../middleware/auth.middleware";
import upload from "../../middleware/uploads.middleware";
import { validate } from "../../middleware/joiValidation.middleware";
import {
    userSignupSchema,
    userLoginSchema,
    userEditProfileSchema,
    userForgotPasswordSchema,
    userResetPasswordSchema,
    userChangePasswordSchema,
    userVerifyEmailSchema,
    userResendOtpSchema,
    userResendVerifyMailSchema
} from "../../validators/User/auth.validator";

const router = Router();

/**
 * @swagger
 * /api/user/auth/signup:
 *   post:
 *     summary: User registration
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
 *                 minLength: 8
 *               nickname:
 *                 type: string
 *                 example: "john_doe"
 *               role:
 *                 type: string
 *                 enum: [user, viewer]
 *                 default: user
 *     responses:
 *       200:
 *         description: Registration successful, verification email sent
 *       400:
 *         description: Validation error or email already exists
 */
router.post("/signup", validate(userSignupSchema), fxn.signUp);

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
router.post("/login", validate(userLoginSchema), fxn.loginUser);

/**
 * @swagger
 * /api/user/auth/verifyEmail:
 *   post:
 *     summary: Verify email address with OTP
 *     description: Verify user email address using OTP code. Returns JWT token that can be used for authenticated requests.
 *     tags: [User - Authentication]
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
 *                 example: "user@example.com"
 *               otp:
 *                 type: string
 *                 example: "123456"
 *                 description: OTP code received via email
 *     responses:
 *       200:
 *         description: Email verified successfully, returns JWT token
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
 *                   example: "OTP verified successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     token:
 *                       type: string
 *                       description: JWT token for authenticated requests
 *                       example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
 *                     user:
 *                       type: object
 *                       properties:
 *                         email_address:
 *                           type: string
 *                         username:
 *                           type: string
 *                         role:
 *                           type: string
 *                     result:
 *                       type: object
 *                       description: Complete user data
 *       400:
 *         description: Invalid or expired OTP
 */
router.post("/verifyEmail", validate(userVerifyEmailSchema), fxn.verifyMail);

/**
 * @swagger
 * /api/user/auth/forgotPassword:
 *   post:
 *     summary: Request password reset OTP
 *     tags: [User - Authentication]
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
 *                 example: "user@example.com"
 *               phoneNumber:
 *                 type: string
 *                 description: Alternative to email_address
 *     responses:
 *       200:
 *         description: Password reset OTP sent to email
 *       404:
 *         description: Account not found
 */
router.post("/forgotPassword", validate(userForgotPasswordSchema), fxn.forgotPassword);

/**
 * @swagger
 * /api/user/auth/resendOtp:
 *   post:
 *     summary: Resend OTP for password reset
 *     tags: [User - Authentication]
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
 *                 example: "user@example.com"
 *               phoneNumber:
 *                 type: string
 *                 description: Alternative to email_address
 *     responses:
 *       200:
 *         description: OTP resent successfully
 *       404:
 *         description: Account not found
 */
router.post("/resendOtp", validate(userResendOtpSchema), fxn.resendOtp);

/**
 * @swagger
 * /api/user/auth/resendMail:
 *   post:
 *     summary: Resend verification email
 *     tags: [User - Authentication]
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
 *                 example: "user@example.com"
 *               phoneNumber:
 *                 type: string
 *                 description: Alternative to email_address
 *     responses:
 *       200:
 *         description: Verification email resent successfully
 *       404:
 *         description: Account not found
 */
router.post("/resendMail", validate(userResendVerifyMailSchema), fxn.resendVerifyMail);

/**
 * @swagger
 * /api/user/auth/resetPassword:
 *   post:
 *     summary: Reset password with OTP
 *     tags: [User - Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email_address
 *               - otp
 *               - newPassword
 *             properties:
 *               email_address:
 *                 type: string
 *                 format: email
 *                 example: "user@example.com"
 *               otp:
 *                 type: string
 *                 example: "123456"
 *                 description: OTP code received via email
 *               newPassword:
 *                 type: string
 *                 format: password
 *                 minLength: 8
 *                 example: "NewPassword123!"
 *     responses:
 *       200:
 *         description: Password reset successful
 *       400:
 *         description: Invalid OTP or validation error
 *       404:
 *         description: Account not found
 */
router.post("/resetPassword", validate(userResetPasswordSchema), fxn.resetPassword);

/**
 * @swagger
 * /api/user/auth/resendOtp:
 *   post:
 *     summary: Resend OTP for email verification
 *     tags: [User Panel - Authentication]
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
 *         description: OTP resent successfully
 */
router.post("/resendOtp", validate(userResendOtpSchema), fxn.resendOtp);

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
router.post('/editProfile', auth, validate(userEditProfileSchema), upload.single('avatar'), fxn.editProfile);

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
router.post("/changePassword", auth, validate(userChangePasswordSchema), fxn.changePassword);

/**
 * @swagger
 * /api/user/auth/getFaqs:
 *   get:
 *     summary: Get all active FAQs
 *     tags: [User Panel - Support]
 *     responses:
 *       200:
 *         description: List of FAQs
 */
router.get("/getFaqs", fxn.getFaqs);

/**
 * @swagger
 * /api/user/auth/getTerms:
 *   get:
 *     summary: Get terms and conditions
 *     tags: [User Panel - Support]
 *     responses:
 *       200:
 *         description: Terms and conditions content
 */
router.get("/getTerms", fxn.getTerms);

/**
 * @swagger
 * /api/user/auth/getPrivacy:
 *   get:
 *     summary: Get privacy policy
 *     tags: [User Panel - Support]
 *     responses:
 *       200:
 *         description: Privacy policy content
 */
router.get("/getPrivacy", fxn.getTerms);

/**
 * @swagger
 * /api/user/auth/getAboutUs:
 *   get:
 *     summary: Get about us content
 *     tags: [User Panel - Support]
 *     responses:
 *       200:
 *         description: About us content
 */
router.get("/getAboutUs", fxn.getTerms);

/**
 * @swagger
 * /api/user/auth/contactUs:
 *   post:
 *     summary: Submit contact us form
 *     tags: [User Panel - Support]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - email
 *               - message
 *             properties:
 *               name:
 *                 type: string
 *               email:
 *                 type: string
 *                 format: email
 *               message:
 *                 type: string
 *     responses:
 *       200:
 *         description: Contact form submitted successfully
 */
router.post("/contactUs", fxn.contactUs);

/**
 * @swagger
 * /api/user/auth/refreshToken:
 *   post:
 *     summary: Refresh access token
 *     tags: [User - Authentication]
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
 *                 description: Refresh token received during login
 *     responses:
 *       200:
 *         description: New access and refresh tokens
 *       401:
 *         description: Invalid or expired refresh token
 */
router.post("/refreshToken", fxn.refreshToken);

/**
 * @swagger
 * /api/user/auth/logout:
 *   post:
 *     summary: Logout user
 *     tags: [User - Authentication]
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
 *                 description: Optional - if provided, only this session is logged out. Otherwise, all sessions are logged out.
 *     responses:
 *       200:
 *         description: Logged out successfully
 */
router.post("/logout", auth, fxn.logout);

export default router;