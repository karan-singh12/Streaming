import { Request, Response, NextFunction } from "express";
import { getDB } from "../../../config/db.config";
import * as apiRes from "../../../utils/apiResponse";
import { ERROR, SUCCESS } from "../../../utils/responseMssg";
import { log } from '../../../utils/logger';

interface MembershipPlanRequestBody {
    id?: string;
    name?: string;
    type?: "trial" | "regular" | "premium";
    durationDays?: number;
    price?: number;
    creditsDiscount?: number;
    features?: string[];
    isActive?: boolean;
    description?: string;
    ids?: string[];
}

export const addMembershipPlan = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const db = getDB();
        const { name, type, durationDays, price, creditsDiscount, features, description, isActive } = req.body;

        if (!name) {
            apiRes.errorResponse(res, "Plan name is required.");
            return;
        }
        if (name.length > 50) {
            apiRes.errorResponse(res, "Plan name must be 50 characters or less.");
            return;
        }
        if (!type) {
            apiRes.errorResponse(res, "Plan type is required.");
            return;
        }
        if (type.length > 20) {
            apiRes.errorResponse(res, "Plan type must be 20 characters or less.");
            return;
        }
        if (price === undefined) {
            apiRes.errorResponse(res, "Price is required.");
            return;
        }

        // Check for duplicate plan name
        const existingPlan = await db('membership_plans')
            .where('plan_name', name)
            .first();
        if (existingPlan) {
            apiRes.errorResponse(res, "A plan with this name already exists.");
            return;
        }

        // Check for duplicate plan type
        const existingType = await db('membership_plans')
            .where('plan_type', type)
            .first();
        if (existingType) {
            apiRes.errorResponse(res, "A plan with this type already exists.");
            return;
        }

        const [savedPlan] = await db('membership_plans')
            .insert({
                plan_name: name,
                plan_type: type,
                price_monthly: price,
                credit_discount_percentage: creditsDiscount || 0,
                features: features ? JSON.stringify(features) : null,
                trial_duration_days: durationDays || null,
                is_active: isActive !== undefined ? isActive : true,
                display_order: 0,
                created_at: db.fn.now(),
                updated_at: db.fn.now()
            })
            .returning('*');

        apiRes.successResponseWithData(res, "Membership plan created successfully", savedPlan);
    } catch (err: any) {
        log(err.message);

        // Handle database constraint errors
        if (err.code === '22001' || err.message?.includes('value too long')) {
            if (err.message?.includes('plan_name') || err.message?.includes('character varying(50)')) {
                apiRes.errorResponse(res, "Plan name is too long. Maximum length is 50 characters.");
                return;
            }
            if (err.message?.includes('plan_type') || err.message?.includes('character varying(20)')) {
                apiRes.errorResponse(res, "Plan type is too long. Maximum length is 20 characters.");
                return;
            }
            apiRes.errorResponse(res, "One of the provided values exceeds the maximum allowed length.");
            return;
        }

        // Handle duplicate key errors
        if (err.code === '23505') {
            if (err.constraint?.includes('plan_name')) {
                apiRes.errorResponse(res, "A plan with this name already exists.");
                return;
            }
            if (err.constraint?.includes('plan_type')) {
                apiRes.errorResponse(res, "A plan with this type already exists.");
                return;
            }
        }



        apiRes.errorResponse(res, ERROR.SomethingWrong);


        return;
    }
};

export const getAllMembershipPlans = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const db = getDB();
        const {
            pageNumber = 1,
            pageSize = 10,
            searchItem,
            type,
            status
        } = req.body;

        const offset = (pageNumber - 1) * pageSize;

        let query = db('membership_plans');

        // Filter by type
        if (type) {
            query = query.where('plan_type', type);
        }

        // Filter by active status
        // Status array: [0] = inactive (false), [1] = active (true), [0, 1] = both
        if (status && Array.isArray(status) && status.length > 0) {
            // Convert status numbers and get unique values
            const statusNumbers = status
                .map((s: any) => Number(s))
                .filter((s: number) => !isNaN(s) && (s === 0 || s === 1));

            const hasActive = statusNumbers.includes(1);
            const hasInactive = statusNumbers.includes(0);

            if (hasActive && !hasInactive) {
                // Only active (status 1)
                query = query.where('is_active', true);
            } else if (hasInactive && !hasActive) {
                // Only inactive (status 0)
                query = query.where('is_active', false);
            }
        // If both are present, show all (no filter)
        }

        // Search by name
        if (searchItem) {
            query = query.where('plan_name', 'ilike', `%${searchItem}%`);
        }

        // Get total count
        const totalRecords = await query.clone().count('* as count').first();
        const total = totalRecords ? Number(totalRecords.count) : 0;

        // Get paginated results
        const result = await query
            .select(
                'id',
                'plan_name as name',
                'plan_type as type',
                'trial_duration_days as durationDays',
                'price_monthly as price',
                'credit_discount_percentage as creditsDiscount',
                'features',
                'is_active as isActive',
                'display_order',
                'created_at',
                'updated_at'
            )
            .orderBy('created_at', 'desc')
            .limit(pageSize)
            .offset(offset);

        apiRes.successResponseWithData(res, SUCCESS.dataFound, {
            result,
            totalRecords: total,
            pageNumber,
            pageSize
        });
    } catch (err: any) {
        log(err.message);

        apiRes.errorResponse(res, ERROR.SomethingWrong);

        return;
    }
};

export const getOneMembershipPlan = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const db = getDB();
        const { id } = req.params;
        if (!id) {
            apiRes.errorResponse(res, "Plan ID is required.");
            return;
        }

        const plan = await db('membership_plans')
            .where('id', parseInt(id))
            .first();

        if (!plan) {
            apiRes.errorResponse(res, "Membership plan not found.");
            return;
        }

        const parsedPlan = {
            ...plan,
            name: plan.plan_name,
            type: plan.plan_type,
            durationDays: plan.trial_duration_days,
            price: plan.price_monthly,
            creditsDiscount: plan.credit_discount_percentage,
            isActive: plan.is_active,
            createdAt: plan.created_at,
            updatedAt: plan.updated_at
        };

        apiRes.successResponseWithData(res, SUCCESS.dataFound, parsedPlan);
    } catch (err: any) {
        log(err.message);

        apiRes.errorResponse(res, ERROR.SomethingWrong);

        return;
    }
};

export const updateMembershipPlan = async (req: Request<{}, {}, MembershipPlanRequestBody>, res: Response, next: NextFunction) => {
    try {
        const db = getDB();
        const { id, name, type, durationDays, price, creditsDiscount, features, description, isActive } = req.body;

        if (!id) {
            apiRes.errorResponse(res, "Plan ID is required.");
            return;
        }

        // Check if new name conflicts with existing plan
        if (name) {
            const existingPlan = await db('membership_plans')
                .where('plan_name', name)
                .where('id', '!=', parseInt(id))
                .first();
            if (existingPlan) {
                apiRes.errorResponse(res, "A plan with this name already exists.");
                return;
            }
        }

        // Check if new type conflicts with existing plan
        if (type) {
            const existingType = await db('membership_plans')
                .where('plan_type', type)
                .where('id', '!=', parseInt(id))
                .first();
            if (existingType) {
                apiRes.errorResponse(res, "A plan with this type already exists.");
                return;
            }
        }

        const updateData: any = {
            updated_at: db.fn.now()
        };
        if (name) updateData.plan_name = name;
        if (type) updateData.plan_type = type;
        if (durationDays !== undefined) updateData.trial_duration_days = durationDays;
        if (price !== undefined) updateData.price_monthly = price;
        if (creditsDiscount !== undefined) updateData.credit_discount_percentage = creditsDiscount;
        if (features) updateData.features = JSON.stringify(features);
        if (isActive !== undefined) updateData.is_active = isActive;

        await db('membership_plans')
            .where('id', parseInt(id))
            .update(updateData);

        const updatedPlan = await db('membership_plans')
            .where('id', parseInt(id))
            .first();

        if (!updatedPlan) {
            apiRes.errorResponse(res, "Membership plan not found.");
            return;
        }

        const parsedPlan = {
            ...updatedPlan,
            name: updatedPlan.plan_name,
            type: updatedPlan.plan_type,
            durationDays: updatedPlan.trial_duration_days,
            price: updatedPlan.price_monthly,
            creditsDiscount: updatedPlan.credit_discount_percentage,
            isActive: updatedPlan.is_active
        };

        apiRes.successResponseWithData(res, "Membership plan updated successfully.", parsedPlan);
    } catch (err: any) {
        log(err.message);

        // Handle database constraint errors
        if (err.code === '22001' || err.message?.includes('value too long')) {
            if (err.message?.includes('plan_name') || err.message?.includes('character varying(50)')) {
                apiRes.errorResponse(res, "Plan name is too long. Maximum length is 50 characters.");
                return;
            }
            if (err.message?.includes('plan_type') || err.message?.includes('character varying(20)')) {
                apiRes.errorResponse(res, "Plan type is too long. Maximum length is 20 characters.");
                return;
            }
            apiRes.errorResponse(res, "One of the provided values exceeds the maximum allowed length.");
            return;
        }

        // Handle duplicate key errors
        if (err.code === '23505') {
            if (err.constraint?.includes('plan_name')) {
                apiRes.errorResponse(res, "A plan with this name already exists.");
                return;
            }
            if (err.constraint?.includes('plan_type')) {
                apiRes.errorResponse(res, "A plan with this type already exists.");
                return;
            }
        }


        apiRes.errorResponse(res, ERROR.SomethingWrong);


        return;
    }
};

export const togglePlanStatus = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const db = getDB();
        const { id, status } = req.body;
        if (!id) {
            apiRes.errorResponse(res, "Plan ID is required.");
            return;
        }

        // Map status: 1 -> true (active), 0 -> false (inactive)
        const isActive = status === 1;

        await db('membership_plans')
            .where('id', parseInt(id))
            .update({ is_active: isActive, updated_at: db.fn.now() });

        const result = await db('membership_plans')
            .where('id', parseInt(id))
            .first();

        let message = status === 1 ? "Membership activated successfully." : "Membership deactivated successfully."

        apiRes.successResponseWithData(res, message, result);
    } catch (err: any) {
        log(err.message);

        apiRes.errorResponse(res, ERROR.SomethingWrong);

        return;
    }
};

export const deleteMembershipPlans = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const db = getDB();
        if (!req.body.id) {
            apiRes.errorResponse(res, "Plan id is required.");
            return;
        }

        await db('membership_plans')
            .where('id', parseInt(req.body.id))
            .update({ is_active: false, updated_at: db.fn.now() });

        apiRes.successResponse(res, "Membership plans deleted successfully.")
    } catch (err: any) {
        log(err.message);

        apiRes.errorResponse(res, ERROR.SomethingWrong);

        return;
    }
};

export const getPlanStats = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const db = getDB();

        // Get total count
        const totalResult = await db('membership_plans').count('* as count').first();
        const total = totalResult ? Number(totalResult.count) : 0;

        // Get active count
        const activeResult = await db('membership_plans')
            .where('is_active', true)
            .count('* as count')
            .first();
        const active = activeResult ? Number(activeResult.count) : 0;

        // Get inactive count
        const inactiveResult = await db('membership_plans')
            .where('is_active', false)
            .count('* as count')
            .first();
        const inactive = inactiveResult ? Number(inactiveResult.count) : 0;

        // Get count by type
        const byTypeResult = await db('membership_plans')
            .select('plan_type')
            .count('* as count')
            .groupBy('plan_type');
        const byType = byTypeResult.map((item: any) => ({
            _id: item.plan_type,
            count: Number(item.count)
        }));

        // Get average price
        const avgPriceResult = await db('membership_plans')
            .avg('price_monthly as avg')
            .first();
        const avgPrice = avgPriceResult ? Number(avgPriceResult.avg) || 0 : 0;

        const result = {
            total,
            active,
            inactive,
            byType,
            avgPrice
        };

        apiRes.successResponseWithData(res, SUCCESS.dataFound, result);
    } catch (err: any) {
        log(err.message);

        apiRes.errorResponse(res, ERROR.SomethingWrong);

        return;
    }
};
