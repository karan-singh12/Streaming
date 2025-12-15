import { Router } from "express";
import * as fxn from "../../controllers/admin/access-management/user.controller"
import auth from "../../middleware/auth.middleware";
import upload from "../../middleware/uploads.middleware";
import { validate } from "../../middleware/joiValidation.middleware";
import {
    addUserSchema,
    updateUserSchema,
    changeStatusSchema,
    deleteUserSchema,
    getAllUsersSchema,
    getOneUserSchema
} from "../../validators/Admin/user.validator";

const router = Router();

/**
 * @swagger
 * /api/admin/user/addUser:
 *   post:
 *     summary: Create a new user
 *     tags: [Admin Panel - User Management]
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
 *               - nickname
 *             properties:
 *               email_address:
 *                 type: string
 *                 format: email
 *               nickname:
 *                 type: string
 *               avatar:
 *                 type: string
 *                 format: binary
 *               membership:
 *                 type: string
 *     responses:
 *       200:
 *         description: User created successfully
 */
router.post("/addUser", upload.single('avatar'), validate(addUserSchema, 'body'), auth, fxn.addUser);

/**
 * @swagger
 * /api/admin/user/getOneUser/{id}:
 *   get:
 *     summary: Get user by ID
 *     tags: [Admin Panel - User Management]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: User ID
 *     responses:
 *       200:
 *         description: User details
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/User'
 */
router.get("/getOneUser/:id", validate(getOneUserSchema, 'params'), auth, fxn.getOneUser);

/**
 * @swagger
 * /api/admin/user/getAllUsers:
 *   post:
 *     summary: Get all users with pagination and filters
 *     tags: [Admin Panel - User Management]
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
 *                 example: "john"
 *               status:
 *                 type: array
 *                 items:
 *                   type: number
 *                 example: [0, 1]
 *     responses:
 *       200:
 *         description: List of users
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
 *                         $ref: '#/components/schemas/User'
 *                     totalRecords:
 *                       type: number
 *                     pageNumber:
 *                       type: number
 *                     pageSize:
 *                       type: number
 */
router.post("/getAllUsers", validate(getAllUsersSchema, 'body'), auth, fxn.getAllUsers);

/**
 * @swagger
 * /api/admin/user/updateUser:
 *   post:
 *     summary: Update user information
 *     tags: [Admin Panel - User Management]
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
 *               email_address:
 *                 type: string
 *                 format: email
 *               nickname:
 *                 type: string
 *               status:
 *                 type: number
 *               avatar:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: User updated successfully
 */
router.post('/updateUser', upload.single('avatar'), validate(updateUserSchema, 'body'), auth, fxn.updateUser);

/**
 * @swagger
 * /api/admin/user/changeStatus:
 *   post:
 *     summary: Change user status (activate/deactivate)
 *     tags: [Admin Panel - User Management]
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
 *         description: User status updated successfully
 */
router.post('/changeStatus', validate(changeStatusSchema, 'body'), auth, fxn.changeStatus);

/**
 * @swagger
 * /api/admin/user/deleteUser:
 *   post:
 *     summary: Delete user (soft delete)
 *     tags: [Admin Panel - User Management]
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
 *         description: User deleted successfully
 */
router.post('/deleteUser', validate(deleteUserSchema, 'body'), auth, fxn.deleteUser);

export default router;