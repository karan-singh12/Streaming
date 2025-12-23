import { Router } from "express";
import * as fxn from "../../controllers/admin/cms-management/email.controller"
import auth from "../../middleware/auth.middleware";

const router = Router();

/**
 * @swagger
 * /api/admin/emailTemplate/addTemplate:
 *   post:
 *     summary: Add new email template
 *     tags: [Admin Panel - Email Templates]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - slug
 *               - subject
 *               - content
 *             properties:
 *               slug:
 *                 type: string
 *                 example: welcome_email
 *               subject:
 *                 type: string
 *                 example: Welcome to MSC LIVE
 *               content:
 *                 type: string
 *                 example: Email content with {variables}...
 *               status:
 *                 type: number
 *                 enum: [0, 1]
 *     responses:
 *       200:
 *         description: Email template added successfully
 */
router.post('/addTemplate', auth, fxn.addTemplate);

/**
 * @swagger
 * /api/admin/emailTemplate/updateTemplate:
 *   post:
 *     summary: Update email template
 *     tags: [Admin Panel - Email Templates]
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
 *               slug:
 *                 type: string
 *               subject:
 *                 type: string
 *               content:
 *                 type: string
 *               status:
 *                 type: number
 *     responses:
 *       200:
 *         description: Email template updated successfully
 */
router.post('/updateTemplate', auth, fxn.updateTemplate);

/**
 * @swagger
 * /api/admin/emailTemplate/getOneTemplate/{id}:
 *   get:
 *     summary: Get email template by ID
 *     tags: [Admin Panel - Email Templates]
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
 *         description: Email template details
 */
router.get('/getOneTemplate/:id', auth, fxn.getOneTemplate);

/**
 * @swagger
 * /api/admin/emailTemplate/getAllTemplate:
 *   post:
 *     summary: Get all email templates with pagination and filters
 *     tags: [Admin Panel - Email Templates]
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
 *         description: List of email templates
 */
router.post('/getAllTemplate', auth, fxn.getAllTemplate);

/**
 * @swagger
 * /api/admin/emailTemplate/changeStatus:
 *   post:
 *     summary: Change email template status (activate/deactivate)
 *     tags: [Admin Panel - Email Templates]
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
 *                 enum: [0, 1]
 *     responses:
 *       200:
 *         description: Template status updated successfully
 */
router.post('/changeStatus', auth, fxn.changeStatus);

export default router;
