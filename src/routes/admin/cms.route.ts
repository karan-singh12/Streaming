import { Router } from "express";
import * as fxn from "../../controllers/admin/cms-management/cms.controller"
import auth from "../../middleware/auth.middleware";

const router = Router();

/**
 * @swagger
 * /api/admin/cms/addContent:
 *   post:
 *     summary: Add new CMS content
 *     tags: [Admin Panel - CMS]
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
 *               - title
 *               - content
 *             properties:
 *               slug:
 *                 type: string
 *                 example: privacy_policy
 *               title:
 *                 type: string
 *                 example: Privacy Policy
 *               content:
 *                 type: string
 *                 example: Privacy policy content here...
 *               status:
 *                 type: number
 *                 enum: [0, 1]
 *     responses:
 *       200:
 *         description: Content added successfully
 */
router.post("/addContent", auth, fxn.addContent);

/**
 * @swagger
 * /api/admin/cms/updateContent:
 *   post:
 *     summary: Update CMS content
 *     tags: [Admin Panel - CMS]
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
 *               title:
 *                 type: string
 *               content:
 *                 type: string
 *               status:
 *                 type: number
 *     responses:
 *       200:
 *         description: Content updated successfully
 */
router.post("/updateContent", auth, fxn.updateContent);

/**
 * @swagger
 * /api/admin/cms/getOneContent/{id}:
 *   get:
 *     summary: Get CMS content by ID
 *     tags: [Admin Panel - CMS]
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
 *         description: CMS content details
 */
router.get("/getOneContent/:id", auth, fxn.getOneContent);

/**
 * @swagger
 * /api/admin/cms/getAllContent:
 *   post:
 *     summary: Get all CMS content with pagination and filters
 *     tags: [Admin Panel - CMS]
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
 *         description: List of CMS content
 */
router.post("/getAllContent", auth, fxn.getAllContent);

/**
 * @swagger
 * /api/admin/cms/addAboutUs:
 *   post:
 *     summary: Add about us content
 *     tags: [Admin Panel - CMS]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *               - content
 *             properties:
 *               title:
 *                 type: string
 *               content:
 *                 type: string
 *     responses:
 *       200:
 *         description: About us content added successfully
 */
router.post("/addAboutUs", auth, fxn.addAboutUs);

/**
 * @swagger
 * /api/admin/cms/updateAboutUs:
 *   post:
 *     summary: Update about us content
 *     tags: [Admin Panel - CMS]
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
 *               title:
 *                 type: string
 *               content:
 *                 type: string
 *     responses:
 *       200:
 *         description: About us content updated successfully
 */
router.post("/updateAboutUs", auth, fxn.updateAboutUs);

/**
 * @swagger
 * /api/admin/cms/getAboutUsDetails/{id}:
 *   get:
 *     summary: Get about us details by ID
 *     tags: [Admin Panel - CMS]
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
 *         description: About us details
 */
router.get("/getAboutUsDetails/:id", auth, fxn.getAboutUsDetails);

export default router;
