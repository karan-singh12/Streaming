import { Request, Response } from "express";
import { getDB } from "../../../config/db.config";
import * as apiRes from "../../../utils/apiResponse";
import { USER, MEMBERSHIP, ERROR } from "../../../utils/responseMssg";

// for get membership plans
export const getPlans = async (req: Request, res: Response) => {
    try {
        const db = getDB();
        const plans = await db("membership_plans")
            .where("is_active", true)
            .orderBy("display_order", "asc")
            .select("*");

        apiRes.successResponse(res, MEMBERSHIP.retrievedSuccessfully, plans);
    } catch (error: any) {
        console.error(error.message);
        apiRes.errorResponse(res, ERROR.SomethingWrong)
        return;
    }
};

// for upgrade membership
export const upgradeMembership = async (req: Request, res: Response) => {
    try {
        const db = getDB();
        const userId = (req as any).user?.id || (req as any).user?._id;
        const { planId } = req.body;

        if (!userId) {
            apiRes.errorResponse(res, USER.accountNotExists)
            return;
        }

        if (!planId) {
            apiRes.errorResponse(res, MEMBERSHIP.planIdRequired)
            return;
        }

        const plan = await db("membership_plans").where("id", planId).first();
        if (!plan) {
            apiRes.errorResponse(res, MEMBERSHIP.invalidPlan)
            return;
        }

        const startDate = new Date();
        const expirationDate = new Date();
        expirationDate.setDate(expirationDate.getDate() + 30);

        await db("user_memberships").insert({
            user_id: userId,
            membership_plan_id: planId,
            start_date: startDate,
            expiration_date: expirationDate,
            status: 1,
            is_auto_renew: true,
            created_at: new Date(),
            updated_at: new Date()
        });

        apiRes.successResponseWithData(res, MEMBERSHIP.upgradedSuccessfully, {
            plan_name: plan.plan_name,
            expiration_date: expirationDate
        });
    } catch (error: any) {
        console.error(error.message);
        apiRes.errorResponse(res, ERROR.SomethingWrong);
        return;
    }
};

// for get user membership
export const getUserMembership = async (req: Request, res: Response) => {
    try {
        const db = getDB();
        const userId = (req as any).user?.id || (req as any).user?._id;

        if (!userId) {
            apiRes.errorResponse(res, USER.accountNotExists);
            return;
        }

        const membership = await db("user_memberships")
            .where("user_id", userId)
            .where("status", 1)
            .first();

        apiRes.successResponse(res, MEMBERSHIP.retrievedSuccessfully, membership);
    } catch (error: any) {
        console.error(error.message);
        apiRes.errorResponse(res, ERROR.SomethingWrong);
        return;
    }
};

// for cancel membership
export const cancelMembership = async (req: Request, res: Response) => {
    try {
        const db = getDB();
        const userId = (req as any).user?.id || (req as any).user?._id;

        if (!userId) {
            apiRes.errorResponse(res, USER.accountNotExists);
            return;
        }

        const membership = await db("user_memberships")
            .where("user_id", userId)
            .where("status", 1)
            .first();

        if (!membership) {
            apiRes.errorResponse(res, MEMBERSHIP.noActiveMembership)
            return;
        }

        await db("user_memberships")
            .where("user_id", userId)
            .where("status", 1)
            .update({
                status: 0,
                updated_at: new Date()
            });

        apiRes.successResponse(res, MEMBERSHIP.cancelledSuccessfully);
    } catch (error: any) {
        console.error(error.message);
        apiRes.errorResponse(res, ERROR.SomethingWrong);
        return;
    }
};
