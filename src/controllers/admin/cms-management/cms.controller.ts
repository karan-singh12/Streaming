import { Request, Response, NextFunction } from "express";
import { addAdminServices } from "../../../services/admin/auth.service";
import { CONTENT, SUCCESS, ERROR } from "../../../utils/responseMssg";
import * as apiRes from "../../../utils/apiResponse";
import { slugGenrator, listing } from "../../../utils/functions";
import { getDB } from "../../../config/db.config";
import asyncHandler from "express-async-handler";
import { log } from "../../../utils/logger";

// Type for Request Body in addContent and updateContent
interface ContentRequestBody {
    id?: string;
    title?: string;
    description?: string;
    status?: string | number;
    contentType?: string;
    slug?: string;
    image?: string;
}

// Add Content
export const addContent = asyncHandler(async (req: Request<{}, {}, ContentRequestBody>, res: Response, next: NextFunction) => {
    try {
        const db = getDB();
        // Generate slug
        req.body.slug = await slugGenrator(req.body.contentType || "");

        // Save content details
        const [result] = await db('cms')
            .insert({
                title: req.body.title,
                description: req.body.description,
                content_type: req.body.contentType,
                slug: req.body.slug,
                status: req.body.status || 1,
                created_at: db.fn.now(),
                modified_at: db.fn.now()
            })
            .returning('*');

        // Send success response
        apiRes.successResponseWithData(res, CONTENT.contentAdded, result);
    } catch (error: any) {
        log(error.message);
        apiRes.errorResponse(res, ERROR.SomethingWrong);
        return;
    }
});

// Update Content
export const updateContent = asyncHandler(async (req: Request<{}, {}, ContentRequestBody>, res: Response, next: NextFunction) => {
    try {
        const db = getDB();
        const { id, title, description, status } = req.body;

        if (!id) {
            apiRes.errorResponse(res, "Content id is required.")
            return
        }

        // Set update object
        const updateData = {
            title,
            description,
            status,
            modified_at: db.fn.now(),
        };

        // Update content details
        await db('cms')
            .where('id', id)
            .update(updateData);

        const data = await db('cms').where('id', id).first();

        if (!data) {
            apiRes.errorResponse(res, ERROR.SomethingWrong);
            return;
        }

        // Determine success message based on slug
        let msg = "";
        switch (data.slug) {
            case process.env.PRIVACY_POLICY:
                msg = CONTENT.privacyUpdated;
                break;
            case process.env.TERMS:
                msg = CONTENT.termsUpdated;
                break;
            case process.env.ABOUT_US:
                msg = CONTENT.aboutUpdated;
                break;
            case process.env.APP_WELCOME_SCREEN:
                msg = CONTENT.welcomeUpdated;
                break;
            case process.env.COMMUNITY_GUIDELINES:
                msg = CONTENT.communityGuidelinesUpdated;
                break;
            default:
                msg = CONTENT.contentUpdated;
                break;
        }

        // Send success response
        apiRes.successResponseWithData(res, msg, data);
    } catch (error: any) {
        log(error.message);
        apiRes.errorResponse(res, ERROR.SomethingWrong);
        return;
    }
});

// Get One Content
export const getOneContent = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    try {
        const db = getDB();
        const { id } = req.params;

        if (!id) {
            apiRes.errorResponse(res, "Content id is required.")
            return
        }

        // Find content details
        const result = await db('cms')
            .where('id', id)
            .select('id', 'title', 'description', 'slug', 'status')
            .first();

        if (!result) {
            apiRes.errorResponse(res, ERROR.NoDataFound);
            return;
        }

        // Send success response
        apiRes.successResponseWithData(res, SUCCESS.dataFound, result);
    } catch (error: any) {
        log(error.message);
        apiRes.errorResponse(res, ERROR.SomethingWrong);
        return;
    }
});

export const getAllContent = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    try {
        const db = getDB();
        const pageSize: number = req.body.pageSize;
        const pageNumber: number = req.body.pageNumber || 1;
        const offset = (pageNumber - 1) * pageSize;
        let searchItem = req.body.searchItem;

        let query = db('cms').where('status', '!=', 2);

        // Search by title
        if (searchItem) {
            query = query.where('title', 'ilike', `%${searchItem}%`);
        }

        // Filter by status - convert array values to numbers
        if (req.body.status && Array.isArray(req.body.status) && req.body.status.length > 0) {
            const statusNumbers = req.body.status
                .map((s: any) => Number(s))
                .filter((s: number) => !isNaN(s) && s !== 2);

            if (statusNumbers.length > 0) {
                query = query.whereIn('cms.status', statusNumbers);
            }
        }

        // Filter by content type
        if (req.body.contentType) {
            query = query.where('content_type', req.body.contentType);
        }

        // Get total count
        const totalRecords = await query.clone().count('* as count').first();
        const total = totalRecords ? Number(totalRecords.count) : 0;

        // Get paginated results
        const result = await query
            .select('id', 'title', 'content_type', 'slug', 'created_at', 'status', 'description')
            .orderBy('created_at', 'desc')
            .limit(pageSize)
            .offset(offset);

        // Send success response
        apiRes.successResponseWithData(res, SUCCESS.dataFound, {
            result,
            totalRecords: total,
            pageNumber,
            pageSize,
        });
    } catch (error: any) {
        log(error.message);
        apiRes.errorResponse(res, ERROR.SomethingWrong);
        return;
    }
});

export const addAboutUs = asyncHandler(async (req: Request<{}, {}, ContentRequestBody>, res: Response, next: NextFunction) => {
    try {
        const db = getDB();
        // Note: AboutUs table doesn't exist in migrations, using cms table instead
        const [result] = await db('cms')
            .insert({
                title: req.body.title,
                description: req.body.description,
                content_type: 'about_us',
                slug: process.env.ABOUT_US || 'about-us',
                status: req.body.status || 1,
                created_at: db.fn.now(),
                modified_at: db.fn.now()
            })
            .returning('*');

        // Send success response
        apiRes.successResponseWithData(res, CONTENT.contentAdded, result);
    } catch (error: any) {
        log(error.message);
        apiRes.errorResponse(res, ERROR.SomethingWrong);
        return;
    }
});

// Update Content
export const updateAboutUs = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    try {
        const db = getDB();
        const { id, title, description, status } = req.body;

        if (!id) {
            apiRes.errorResponse(res, "Content id is required.")
            return
        }

        // Set update object
        const updateData = {
            title,
            description,
            status,
            modified_at: db.fn.now(),
        };

        // Update content details
        await db('cms')
            .where('id', id)
            .update(updateData);

        const data = await db('cms').where('id', id).first();

        // Send success response
        apiRes.successResponseWithData(res, CONTENT.aboutUpdated, data);
    } catch (error: any) {
        log(error.message);
        apiRes.errorResponse(res, ERROR.SomethingWrong);
        return;
    }
});

// Get One Content
export const getAboutUsDetails = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    try {
        const db = getDB();
        const { id } = req.params;

        if (!id) {
            apiRes.errorResponse(res, "About us id is required.")
            return
        }

        // Find content details
        const result = await db('cms')
            .where('id', id)
            .select('id', 'title', 'description')
            .first();

        // Send success response
        apiRes.successResponseWithData(res, SUCCESS.dataFound, result);
    } catch (error: any) {
        log(error.message);
        apiRes.errorResponse(res, ERROR.SomethingWrong);
        return;
    }
});

export const getAllModels = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    try {
        const db = getDB();
        // Note: This queries streamers, not users with role "model"
        const result = await db('streamers')
            .join('users', 'streamers.user_id', 'users.id')
            .where('users.status', '!=', 2) // 2 = deleted
            .where('users.role', 'streamer')
            .select('streamers.id', 'users.nickname as username')
            .orderBy('streamers.created_at', 'desc');

        apiRes.successResponseWithData(res, SUCCESS.dataFound, { result });
    } catch (error: any) {
        log(error.message);
        apiRes.errorResponse(res, ERROR.SomethingWrong);
        return;
    }
});