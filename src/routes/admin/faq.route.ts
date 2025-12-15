import { Router } from "express";
import * as fxn from "../../controllers/admin/cms-management/faq.controller";
import auth from "../../middleware/auth.middleware";

const router = Router();

/**
 * @swagger
 * /api/admin/faq/addFaq:
 *   post:
 *     summary: Add new FAQ
 *     tags: [Admin Panel - FAQ]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - question
 *               - answer
 *             properties:
 *               question:
 *                 type: string
 *                 example: What is streaming LIVE?
 *               answer:
 *                 type: string
 *                 example: streaming LIVE is a video streaming platform...
 *               status:
 *                 type: number
 *                 enum: [0, 1]
 *     responses:
 *       200:
 *         description: FAQ added successfully
 */
router.post("/addFaq", auth, fxn.addFaq);

/**
 * @swagger
 * /api/admin/faq/updateFaq:
 *   post:
 *     summary: Update FAQ
 *     tags: [Admin Panel - FAQ]
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
 *               question:
 *                 type: string
 *               answer:
 *                 type: string
 *               status:
 *                 type: number
 *     responses:
 *       200:
 *         description: FAQ updated successfully
 */
router.post("/updateFaq", auth, fxn.updateFaq);

/**
 * @swagger
 * /api/admin/faq/getOneFaq/{id}:
 *   get:
 *     summary: Get FAQ by ID
 *     tags: [Admin Panel - FAQ]
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
 *         description: FAQ details
 */
router.get("/getOneFaq/:id", auth, fxn.getOneFaq);

/**
 * @swagger
 * /api/admin/faq/getAllFaqs:
 *   post:
 *     summary: Get all FAQs with pagination and filters
 *     tags: [Admin Panel - FAQ]
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
 *         description: List of FAQs
 */
router.post("/getAllFaqs", auth, fxn.getAllFaqs);

/**
 * @swagger
 * /api/admin/faq/deleteFaq:
 *   post:
 *     summary: Delete FAQ (soft delete)
 *     tags: [Admin Panel - FAQ]
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
 *         description: FAQ deleted successfully
 */
router.post("/deleteFaq", auth, fxn.deleteFaq);

/**
 * @swagger
 * /api/admin/faq/changeStatus:
 *   post:
 *     summary: Change FAQ status (activate/deactivate)
 *     tags: [Admin Panel - FAQ]
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
 *         description: FAQ status updated successfully
 */
router.post("/changeStatus", auth, fxn.changeFaqStatus);

export default router;
