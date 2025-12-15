import { Request, Response, NextFunction } from "express";
import { addAdminServices } from "../../../services/admin/auth.service";
import {EMAILTEMPLATE, SUCCESS, ERROR} from "../../../utils/responseMssg";
import { log } from '../../../utils/logger';
import * as apiRes from "../../../utils/apiResponse";
import { slugGenrator } from "../../../utils/functions";
import { getDB } from "../../../config/db.config";
import asyncHandler from "express-async-handler";

interface AuthenticatedRequest extends Request {
    user?: { _id?: string; id?: string }; 
};

// Admin registration controller
export const addTemplate = asyncHandler(async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
        const db = getDB();
        if (!req.user) {
            return next(({ message: "Unauthorized" }));
        }

        const slug = await slugGenrator(req.body.title);
        const adminId = req.user._id || req.user.id;
        
        await db('email_templates')
            .insert({
                title: req.body.title,
                slug: slug,
                subject: req.body.subject,
                content: req.body.content,
                status: req.body.status || 1,
                created_by: adminId,
                created_at: db.fn.now(),
                modified_at: db.fn.now()
            });
        apiRes.successResponse(res, EMAILTEMPLATE.templateAdded);
    } catch (error: any) {
        log(error.message);
        apiRes.errorResponse(res, ERROR.SomethingWrong);
        return;
    }
});

export const getAllTemplate = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    try {
        const db = getDB();
        const { pageSize, pageNumber, searchItem, sortOrder, sortBy, status } = req.body;

        const page = pageNumber || 1;
        const offset = (page - 1) * pageSize;
        const order = sortOrder === 1 ? 'asc' : 'desc';
        const sortColumn = sortBy || 'et.created_at'; // FIXED HERE

        let query = db('email_templates as et')
            .leftJoin('admins as a', 'et.created_by', 'a.id')
            .where('et.status', '!=', 2);

        // STATUS FILTER
        if (status && Array.isArray(status) && status.length > 0) {
            const statusNumbers = status
                .map((s: any) => Number(s))
                .filter((s: number) => !isNaN(s) && s !== 2);

            if (statusNumbers.length > 0) {
                query = query.whereIn('et.status', statusNumbers);
            }
        }

        // SEARCH FILTER
        if (searchItem) {
            query = query.where(function () {
                this.where('et.title', 'ilike', `%${searchItem}%`)
                    .orWhere('et.subject', 'ilike', `%${searchItem}%`);
            });
        }

        // TOTAL RECORDS
        const totalRecords = await query.clone().count('* as count').first();
        const total = totalRecords ? Number(totalRecords.count) : 0;

        // RESULTS
        const result = await query
            .select(
                'et.id',
                'et.title',
                'et.subject',
                'et.created_at',
                'et.modified_at',
                'et.status',
                'et.created_by',
                'a.name as created_by_name',
                'a.email_address as created_by_email_address',
                'a.role as created_by_role'
            )
            .orderBy(sortColumn, order)
            .limit(pageSize)
            .offset(offset);

        apiRes.successResponseWithData(res, SUCCESS.dataFound, {
            result,
            totalRecords: total,
            pageNumber: page,
            pageSize
        });

    } catch (error: any) {
        log(error.message);
        apiRes.errorResponse(res, ERROR.SomethingWrong);
        return;
    }
});

export const updateTemplate = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    try {
        const db = getDB();
        const updateData = {
            title: req.body.title,
            subject: req.body.subject,
            content: req.body.content,
            status: req.body.status,
            modified_at: db.fn.now(),
        };

        await db('email_templates')
            .where('id', req.body.id)
            .update(updateData);

        const result = await db('email_templates').where('id', req.body.id).first();
        apiRes.successResponseWithData(res, EMAILTEMPLATE.templateUpdated, result);
    } catch (error: any) {
        log(error.message);
        apiRes.errorResponse(res, ERROR.SomethingWrong);
        return;
    }
});

export const getOneTemplate = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    try {
        const db = getDB();
        const result = await db('email_templates')
            .where('email_templates.id', req.params.id)
            .leftJoin('admins', 'email_templates.created_by', 'admins.id')
            .select(
                'email_templates.id',
                'email_templates.title',
                'email_templates.slug',
                'email_templates.subject',
                'email_templates.content',
                'email_templates.status',
                'email_templates.created_at',
                'email_templates.created_by',
                'admins.name as created_by_name',
                'admins.email_address as created_by_email'
            )
            .first();
        apiRes.successResponseWithData(res, SUCCESS.dataFound, result);
    } catch (error: any) {
        log(error.message);
        apiRes.errorResponse(res, ERROR.SomethingWrong);
        return;
    }
});

export const changeStatus = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    try {
        const db = getDB();
        let status = req.body.status;
        if (req.url.includes("deleteTemplate")) {
            status = 2;
        }
        
        await db('email_templates')
            .where('id', req.body.id)
            .update({ status, modified_at: db.fn.now() });
        
        const msg = req.url.includes("deleteTemplate") ? EMAILTEMPLATE.templateDeleted : 
            status === 1 ? EMAILTEMPLATE.templateActived : EMAILTEMPLATE.templateInactived;
        
        apiRes.successResponse(res, msg);
    } catch (error: any) {
        log(error.message);
        apiRes.errorResponse(res, ERROR.SomethingWrong);
        return;
    }
});