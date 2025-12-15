import { Request, Response, NextFunction } from "express";
import asyncHandler from "express-async-handler";
import { getDB } from "../../../config/db.config";
import * as apiRes from "../../../utils/apiResponse";
import { ERROR, FAQ, SUCCESS } from "../../../utils/responseMssg";
import { log } from '../../../utils/logger';

// Type for Request Body in FAQ functions
interface FaqRequestBody {
    id?: string;
    title?: string;
    description?: string;
    status?: string | number;
}

// Get All faqs
export const getAllFaqs = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    try {
        const db = getDB();
        const pageSize: number = req.body.pageSize;
        const pageNumber: number = req.body.pageNumber || 1;
        const offset = (pageNumber - 1) * pageSize;
        const searchItem: string = req.body.searchItem;

        let query = db('faqs').where('status', '!=', 2);

        // Filter by status - convert array values to numbers
        if (req.body.status && Array.isArray(req.body.status) && req.body.status.length > 0) {
            const statusNumbers = req.body.status
                .map((s: any) => Number(s))
                .filter((s: number) => !isNaN(s) && s !== 2);
            
            if (statusNumbers.length > 0) {
                query = query.whereIn('faqs.status', statusNumbers);
            }
        }

        // Search by title
        if (searchItem) {
            query = query.where('title', 'ilike', `%${searchItem}%`);
        }

        // Get total count
        const totalRecords = await query.clone().count('* as count').first();
        const total = totalRecords ? Number(totalRecords.count) : 0;

        // Find all FAQ details
        const result = await query
            .select('id', 'title', 'description', 'created_at', 'status')
            .orderBy('created_at', 'desc')
            .limit(pageSize)
            .offset(offset);

        apiRes.successResponseWithData(res, SUCCESS.dataFound, { result, totalRecords: total, pageNumber, pageSize });
    } catch (error: any) {
        log(error.message);
        apiRes.errorResponse(res, ERROR.SomethingWrong);
        return;
    }
});

// Add faqs
export const addFaq = asyncHandler(async (req: Request<{}, {}, FaqRequestBody>, res: Response, next: NextFunction) => {
    try {
        const db = getDB();
        const [result] = await db('faqs')
            .insert({
                title: req.body.title,
                description: req.body.description,
                status: req.body.status || 1,
                created_at: db.fn.now(),
                modified_at: db.fn.now()
            })
            .returning('*');
        apiRes.successResponseWithData(res, FAQ.faqAdded, result);
    } catch (error: any) {
        log(error.message);
        apiRes.errorResponse(res, ERROR.SomethingWrong);
        return;
    }
});

// Update faqs
export const updateFaq = asyncHandler(async (req: Request<{}, {}, FaqRequestBody>, res: Response, next: NextFunction) => {
    try {
        const db = getDB();
        if (!req.body.id) {
            apiRes.errorResponse(res, "FAQ id is required.")
            return
        }

        const updateData = {
            title: req.body.title,
            description: req.body.description,
            status: req.body.status,
            modified_at: db.fn.now(),
        };

        await db('faqs')
            .where('id', req.body.id)
            .update(updateData);

        const data = await db('faqs').where('id', req.body.id).first();

        apiRes.successResponseWithData(res, FAQ.faqUpdated, data);
    } catch (error: any) {
        log(error.message);
        apiRes.errorResponse(res, ERROR.SomethingWrong);
        return;
    }
});

// Get One faq
export const getOneFaq = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    try {
        const db = getDB();
        const { id } = req.params;

        if (!id) {
            apiRes.errorResponse(res, "FAQ id is required.")
            return
        }

        const result = await db('faqs')
            .where('id', id)
            .select('id', 'title', 'description', 'status')
            .first();

        apiRes.successResponseWithData(res, SUCCESS.dataFound, result);
    } catch (error: any) {
        log(error.message);
        apiRes.errorResponse(res, ERROR.SomethingWrong);
        return;
    }
});

// Delete faqs
export const deleteFaq = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    try {
        const db = getDB();
        await db('faqs')
            .where('id', req.body.id)
            .update({ status: 2, modified_at: db.fn.now() });
        apiRes.successResponseWithData(res, FAQ.faqDeleted, {});
    } catch (error: any) {
        log(error.message);
        apiRes.errorResponse(res, ERROR.SomethingWrong);
        return;
    }
});

// for Change Status
export const changeFaqStatus = asyncHandler(async (req: Request<{}, {}, FaqRequestBody>, res: Response, next: NextFunction) => {
    try {
        const db = getDB();
        if (!req.body.id) {
            apiRes.errorResponse(res, "FAQ id is required.")
            return
        }
        await db('faqs')
            .where('id', req.body.id)
            .update({ status: req.body.status, modified_at: db.fn.now() });

        const result = await db('faqs').where('id', req.body.id).first();

        const msg = req.body.status == 1 ? FAQ.faqActivated : FAQ.faqDeactivated;
        apiRes.successResponseWithData(res, msg, result);
    } catch (error: any) {
        log(error.message);
        apiRes.errorResponse(res, ERROR.SomethingWrong);
        return;
    }
});
