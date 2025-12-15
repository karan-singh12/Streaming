import { Router } from "express";
import * as fxn from "../../controllers/admin/payment-management/membership.controller";
import auth from "../../middleware/auth.middleware";
import upload from "../../middleware/uploads.middleware";

const router = Router();

/**
 * @swagger
 * /api/admin/membership/addMembership:
 *   post:
 *     summary: Create a new membership plan
 *     tags: [Admin Panel - Membership Plans]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - type
 *               - price
 *             properties:
 *               name:
 *                 type: string
 *                 maxLength: 50
 *                 example: Premium Plan
 *               type:
 *                 type: string
 *                 enum: [trial, regular, premium]
 *                 maxLength: 20
 *               price:
 *                 type: number
 *                 example: 29.99
 *               durationDays:
 *                 type: number
 *                 nullable: true
 *               creditsDiscount:
 *                 type: number
 *                 example: 10
 *               features:
 *                 type: array
 *                 items:
 *                   type: string
 *               isActive:
 *                 type: boolean
 *                 default: true
 *     responses:
 *       200:
 *         description: Membership plan created successfully
 *       400:
 *         description: Validation error (name/type too long or already exists)
 */
router.post("/addMembership", auth, fxn.addMembershipPlan);

/**
 * @swagger
 * /api/admin/membership/getOneMembership/{id}:
 *   get:
 *     summary: Get membership plan by ID
 *     tags: [Admin Panel - Membership Plans]
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
 *         description: Membership plan details
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/MembershipPlan'
 */
router.get("/getOneMembership/:id", auth, fxn.getOneMembershipPlan);

/**
 * @swagger
 * /api/admin/membership/getAllMemberships:
 *   post:
 *     summary: Get all membership plans with pagination and filters
 *     tags: [Admin Panel - Membership Plans]
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
 *               type:
 *                 type: string
 *                 enum: [trial, regular, premium]
 *               status:
 *                 type: array
 *                 items:
 *                   type: number
 *                 example: [0, 1]
 *                 description: 0 = inactive, 1 = active
 *     responses:
 *       200:
 *         description: List of membership plans
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
 *                         $ref: '#/components/schemas/MembershipPlan'
 *                     totalRecords:
 *                       type: number
 *                     pageNumber:
 *                       type: number
 *                     pageSize:
 *                       type: number
 */
router.post("/getAllMemberships", auth, fxn.getAllMembershipPlans);

/**
 * @swagger
 * /api/admin/membership/updateMembership:
 *   post:
 *     summary: Update membership plan
 *     tags: [Admin Panel - Membership Plans]
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
 *                 type: string
 *               name:
 *                 type: string
 *                 maxLength: 50
 *               type:
 *                 type: string
 *                 maxLength: 20
 *               price:
 *                 type: number
 *               durationDays:
 *                 type: number
 *               creditsDiscount:
 *                 type: number
 *               features:
 *                 type: array
 *                 items:
 *                   type: string
 *               isActive:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Membership plan updated successfully
 */
router.post("/updateMembership", auth, fxn.updateMembershipPlan);

/**
 * @swagger
 * /api/admin/membership/changeStatus:
 *   post:
 *     summary: Toggle membership plan status (activate/deactivate)
 *     tags: [Admin Panel - Membership Plans]
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
 *                 description: 0 = inactive, 1 = active
 *     responses:
 *       200:
 *         description: Membership status updated successfully
 */
router.post("/changeStatus", auth, fxn.togglePlanStatus);

/**
 * @swagger
 * /api/admin/membership/getMembershipStats:
 *   get:
 *     summary: Get membership plan statistics
 *     tags: [Admin Panel - Membership Plans]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Membership statistics
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
 *                     total:
 *                       type: number
 *                     active:
 *                       type: number
 *                     inactive:
 *                       type: number
 *                     byType:
 *                       type: array
 *                     avgPrice:
 *                       type: number
 */
router.get("/getMembershipStats", auth, fxn.getPlanStats);

/**
 * @swagger
 * /api/admin/membership/deleteMemberships:
 *   post:
 *     summary: Delete membership plan (soft delete)
 *     tags: [Admin Panel - Membership Plans]
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
 *         description: Membership plan deleted successfully
 */
router.post("/deleteMemberships", auth, fxn.deleteMembershipPlans);

export default router;
