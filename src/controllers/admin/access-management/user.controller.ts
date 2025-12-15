import { Request, Response, NextFunction } from "express";
import bcrypt from "bcryptjs";
import { getDB } from "../../../config/db.config";
import * as apiRes from "../../../utils/apiResponse";
import { sendEmail, deleteMulterFile, deleteUploadedFile } from "../../../utils/functions";
import { ERROR, USER, MODEL, SUCCESS } from "../../../utils/responseMssg";
import { PasswordService } from "../../../services/auth/password.service";
import { log } from '../../../utils/logger';

interface UserRequestBody {
    id?: string;
    name?: string;
    email?: string;
    phoneNumber?: string;
    countryCode?: string;
    status?: string | number;
}

export const addUser = async (req: Request<{}, {}, any>, res: Response, next: NextFunction) => {
    try {
        const db = getDB();
        const { email_address, nickname, credit_balance } = req.body;

        let imagePath: string | undefined;
        if (req.file) {
            imagePath = req.file.path.replace(/\\/g, "/");
        }

        const existingUser = await db('users')
            .where('email_address', 'ilike', email_address)
            .where('status', '!=', 2)
            .first();

        if (existingUser?.email_address?.toLowerCase() === email_address?.toLowerCase()) {
            if (req.file) await deleteMulterFile(req.file);
            apiRes.errorResponse(res, "Email Already Exist !.")
            return
        }

        const randomPassword = Math.random().toString(36).slice(-8);
        const hashedPassword = await PasswordService.hashPassword(randomPassword);

        const now = new Date();
        const [savedUser] = await db('users')
            .insert({
                nickname: nickname || `member_${Date.now()}`,
                email_address: email_address,
                password_hash: hashedPassword,
                role: 'user',
                status: 1,
                avatar: imagePath || null,
                is_age_verified: false,
                language: 'en',
                registration_date: now,
                email_verified: false,
                created_at: now,
                updated_at: now,
            })
            .returning('*');

        const existingWallet = await db('credit_wallets')
            .where('user_id', savedUser.id)
            .first();

        if (!existingWallet) {
            await db('credit_wallets')
                .insert({
                    user_id: savedUser.id,
                    balance: credit_balance || 0,
                    frozen_credits: 0,
                    total_spent: 0,
                    created_at: db.fn.now(),
                    updated_at: db.fn.now()
                });
        }

        const templateResult = await db('email_templates')
            .where('slug', process.env.USER_SEND_PASSWORD)
            .where('status', 1)
            .first();

        if (templateResult) {
            let content = templateResult.content
                .replace("{username}", nickname ?? "")
                .replace("{email}", email_address ?? "")
                .replace("{password}", randomPassword);

            await sendEmail({
                email: email_address ?? "",
                subject: templateResult.subject,
                message: content,
            });
        }

        apiRes.successResponseWithData(res, USER.userAdded, savedUser);
    } catch (error: any) {
        log(error.message);
        if (req.file) await deleteMulterFile(req.file);
        apiRes.errorResponse(res, ERROR.SomethingWrong);
        return;
    }
};

export const getAllUsers = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const db = getDB();
        const { pageSize, pageNumber, searchItem, status, type } = req.body;
        const offset = (pageNumber - 1) * pageSize;

        let query = db('users')
            .leftJoin('user_memberships', function () {
                this.on('users.id', '=', 'user_memberships.user_id')
                    .andOn('user_memberships.status', db.raw('1'))
                    .andOn('user_memberships.expiration_date', '>', db.raw('NOW()'));
            })
            .leftJoin('membership_plans', 'user_memberships.membership_plan_id', 'membership_plans.id')
            .leftJoin('credit_wallets', 'users.id', 'credit_wallets.user_id')
            .where('users.role', 'user')
            .where('users.status', '!=', 2);

        if (status && Array.isArray(status) && status.length > 0) {
            const statusNumbers = status.map((s: any) => Number(s)).filter((s: number) => !isNaN(s) && s !== 2);

            if (statusNumbers.length > 0) {
                query = query.whereIn('users.status', statusNumbers);
            }
        }

        if (type) {
            query = query.where('membership_plans.plan_type', type);
        }

        if (searchItem) {
            query = query.where(function () {
                this.where('users.nickname', 'ilike', `%${searchItem}%`)
                    .orWhere('users.email_address', 'ilike', `%${searchItem}%`);
            });
        }

        const totalRecords = await query.clone().countDistinct('users.id as count').first();
        const total = totalRecords ? Number(totalRecords.count) : 0;

        const result = await query
            .select(
                'users.id',
                'users.nickname',
                'users.avatar',
                'users.email_address',
                'membership_plans.plan_type as membership_type',
                'user_memberships.expiration_date as membership_expiration_date',
                'credit_wallets.balance',
                'users.status',
                'users.created_at'
            )
            .groupBy('users.id', 'users.nickname', 'users.avatar', 'users.email_address', 'membership_plans.plan_type', 'user_memberships.expiration_date', 'users.status', 'users.created_at')
            .groupBy('credit_wallets.balance')
            .orderBy('users.created_at', 'desc')
            .limit(pageSize)
            .offset(offset);

        apiRes.successResponseWithData(res, SUCCESS.dataFound, { result, totalRecords: total, pageNumber, pageSize });
    } catch (error: any) {
        log(error.message)
        apiRes.errorResponse(res, ERROR.SomethingWrong);
        return;
    }
};

export const getOneUser = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const db = getDB();
        const { id } = req.params;
        if (!id) {
            apiRes.errorResponse(res, "User id required.")
            return
        }

        const result = await db('users')
            .leftJoin('user_memberships', function () {
                this.on('users.id', '=', 'user_memberships.user_id')
                    .andOn('user_memberships.status', db.raw('1'))
                    .andOn('user_memberships.expiration_date', '>', db.raw('NOW()'));
            })
            .leftJoin('credit_wallets', 'users.id', 'credit_wallets.user_id')
            .leftJoin('membership_plans', 'user_memberships.membership_plan_id', 'membership_plans.id')
            .where('users.id', id)
            .where('users.status', '!=', 2)
            .select(
                'users.id',
                'users.nickname',
                'users.email_address',
                'users.role',
                'users.status',
                'users.avatar',
                'users.language',
                'users.is_age_verified',
                'users.age_verification_method',
                'users.token_of_trust',
                'membership_plans.plan_type as membership_type',
                'user_memberships.expiration_date as membership_expiration_date',
                'users.email_verified',
                'users.registration_date',
                'users.created_at',
                'users.updated_at',
                'users.last_login_at',
                'credit_wallets.balance'
            )
            .first();

        if (!result) {
            apiRes.errorResponse(res, ERROR.NoDataFound)
            return
        }

        apiRes.successResponseWithData(res, SUCCESS.dataFound, result);
    } catch (error: any) {
        log(error.message);
        apiRes.errorResponse(res, ERROR.SomethingWrong);
        return;
    }
};

export const updateUser = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const db = getDB();
        const { id, email_address, nickname, status, membership, membership_expiration_date, credit_balance } = req.body;
        const image = req.file?.path;


        if (!id) {
            apiRes.errorResponse(res, "User id required.")
            return
        }

        const currentUser = await db('users')
            .where('id', id)
            .where('status', '!=', 2)
            .first();

        if (!currentUser) {
            if (req.file) await deleteMulterFile(req.file);
            apiRes.errorResponse(res, ERROR.NoDataFound);
            return;
        }

        if (email_address && email_address.toLowerCase() !== currentUser.email_address?.toLowerCase()) {
            const existingUser = await db('users')
                .where('id', '!=', id)
                .where('status', '!=', 2)
                .where('email_address', 'ilike', email_address)
                .first();

            if (existingUser) {
                if (req.file) await deleteMulterFile(req.file);
                apiRes.errorResponse(res, USER.emailAlreadyExists);
                return;
            }
        }

        if (nickname && nickname.toLowerCase() !== currentUser.nickname?.toLowerCase()) {
            const existingNickname = await db('users')
                .where('id', '!=', id)
                .where('status', '!=', 2)
                .where('nickname', 'ilike', nickname)
                .first();

            if (existingNickname) {
                if (req.file) await deleteMulterFile(req.file);
                apiRes.errorResponse(res, "Nickname already exists.");
                return;
            }
        }

        const updateFields: any = {
            updated_at: new Date()
        };

        if (nickname) updateFields.nickname = nickname;
        if (email_address) updateFields.email_address = email_address.toLowerCase();
        if (status !== undefined) updateFields.status = status;
        if (image) updateFields.avatar = image;

        await db('users')
            .where('id', id)
            .update(updateFields);

        if (membership || membership_expiration_date) {
            let membershipPlanId = null;
            if (membership) {
                const plan = await db('membership_plans')
                    .where('plan_type', membership)
                    .first();
                if (plan) {
                    membershipPlanId = plan.id;
                }
            }

            const existingMembership = await db('user_memberships')
                .where('user_id', id)
                .where('status', 1)
                .where('expiration_date', '>', db.raw('NOW()'))
                .first();

            if (existingMembership) {
                const membershipUpdate: any = {};
                if (membershipPlanId) membershipUpdate.membership_plan_id = membershipPlanId;
                if (membership_expiration_date) membershipUpdate.expiration_date = new Date(membership_expiration_date);
                membershipUpdate.updated_at = new Date();

                await db('user_memberships')
                    .where('id', existingMembership.id)
                    .update(membershipUpdate);
            } else if (membershipPlanId) {
                const expirationDate = membership_expiration_date
                    ? new Date(membership_expiration_date)
                    : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

                await db('user_memberships')
                    .insert({
                        user_id: id,
                        membership_plan_id: membershipPlanId,
                        start_date: db.fn.now(),
                        expiration_date: expirationDate,
                        status: 1,
                        is_trial: false,
                        is_auto_renew: true,
                        created_at: db.fn.now(),
                        updated_at: db.fn.now()
                    });
            }
        }

        // Create credit wallet for new user
        const existingWallet = await db('credit_wallets')
            .where('user_id', id)
            .first();

        if (!existingWallet) {
            await db('credit_wallets').insert({
                user_id: id,
                balance: credit_balance || 0,
                frozen_credits: 0,
                total_spent: 0,
                created_at: db.fn.now(),
                updated_at: db.fn.now()
            });
        } else {
            await db('credit_wallets')
                .where('user_id', id)
                .update({
                    balance: credit_balance,
                    updated_at: db.fn.now()
                });
        }

        const updatedUser = await db('users').where('id', id).first();

        apiRes.successResponse(res, USER.userUpdated, updatedUser);
    } catch (error: any) {
        log(error.message);
        apiRes.errorResponse(res, ERROR.SomethingWrong);
        return;
    }
};

export const changeStatus = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const db = getDB();
        if (!req.body.id) {
            apiRes.errorResponse(res, "User id required.")
            return
        }

        // Status: 0 = inactive, 1 = active, 2 = deleted
        const newStatus = req.body.status;

        await db('users')
            .where('id', req.body.id)
            .update({ status: newStatus, updated_at: new Date() });

        const result = await db('users').where('id', req.body.id).first();

        if (!result) {
            apiRes.errorResponse(res, ERROR.NoDataFound)
            return
        }
        const msg = req.body.status == 1 ? USER.userActivated : USER.userDeactivated;
        apiRes.successResponseWithData(res, msg, result);
    } catch (error: any) {
        log(error.message);
        apiRes.errorResponse(res, ERROR.SomethingWrong);
        return;
    }
};

export const deleteUser = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const db = getDB();
        if (!req.body.id) {
            apiRes.errorResponse(res, "User id required.")
            return
        }

        await db('users')
            .where('id', req.body.id)
            .update({ status: 2, updated_at: new Date() });

        apiRes.successResponseWithData(res, USER.userDeleted, {});
    } catch (error: any) {
        log(error.message);
        apiRes.errorResponse(res, ERROR.SomethingWrong);
        return;
    }
};