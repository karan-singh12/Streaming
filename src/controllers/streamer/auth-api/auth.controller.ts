import { Request, Response, NextFunction, RequestHandler } from "express";
import { USER, STREAMER, SUCCESS, ERROR } from "../../../utils/responseMssg";
import * as apiRes from "../../../utils/apiResponse";
import { getDB } from "../../../config/db.config";
import { sendEmail } from "../../../utils/functions";
import bcrypt from 'bcryptjs';
import jwt from "jsonwebtoken";
import { PasswordService } from "../../../services/auth/password.service";
import { TokenService } from "../../../services/auth/token.service";
import { SessionService } from "../../../services/auth/session.service";
import { getClientIp, getUserAgent } from "../../../utils/requestHelpers";
import { log } from '../../../utils/logger';

interface AuthenticatedRequest extends Request {
    user?: any;
}
interface MulterFiles {
    avatar?: Express.Multer.File[];
    thumbnail?: Express.Multer.File[];
    [fieldname: string]: Express.Multer.File[] | undefined;
}

export const loginStreamer = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
        const db = getDB();
        const email_address = req.body.email_address || req.body.email;
        const normalizedEmail = email_address ? email_address.toLowerCase() : null;
        const { password } = req.body;

        if (!password || !normalizedEmail) {
            apiRes.validationError(res, STREAMER.invalidLogin);
            return;
        }

        const data: any = await db('users')
            .where('email_address', 'ilike', normalizedEmail)
            .where('status', '!=', 2)
            .first();

        if (!data) {
            apiRes.errorResponse(res, USER.invalidLogin);
            return;
        }

        if (data.status === 0 || data.status === 2) { // 0 = inactive, 2 = deleted
            apiRes.errorResponse(res, USER.accountDeactivated);
            return;
        }

        // if (!data.email_verified) {
        //     apiRes.errorResponse(res, USER.accountNotVerified);
        //     return;
        // }

        const match = await PasswordService.verifyPassword(password, data.password_hash);

        if (!match) {
            apiRes.errorResponse(res, USER.invalidLogin);
            return;
        }

        // Get client info
        const clientIp = getClientIp(req);
        const userAgent = getUserAgent(req);

        // Generate access token
        const { token: accessToken, jti: accessJti } = TokenService.generateAccessToken(
            data.id,
            process.env.TOKEN_SECRET_KEY_3!,
            process.env.STREAMER_TOKEN_EXPIRE_TIME || "10d"
        );

        const { token: refreshToken, jti: refreshJti, hash: refreshTokenHash } = TokenService.generateRefreshToken();
        const refreshExpiresAt = new Date();
        refreshExpiresAt.setDate(refreshExpiresAt.getDate() + 30);

        await TokenService.storeRefreshToken(
            data.id,
            null,
            refreshJti,
            refreshTokenHash,
            refreshExpiresAt,
            clientIp,
            userAgent
        );

        // Create session tracking
        const { sessionId, sessionToken } = await SessionService.trackSession(
            data.id,
            null,
            clientIp,
            userAgent,
            refreshJti
        );

        await db('users')
            .where('id', data.id)
            .update({
                last_login_at: db.fn.now(),
                updated_at: db.fn.now()
            });

        const updatedUser = await db('users').where('id', data.id).first();
        const { password_hash, otp_hash, ...result } = updatedUser;

        apiRes.successResponseWithData(res, USER.loginSuccess, {
            token: accessToken,
            refreshToken,
            sessionToken,
            result
        });
    } catch (error: any) {
        log(error.message);
        apiRes.errorResponse(res, ERROR.SomethingWrong);
        return;
    }
};

export const getUserDetails = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
        const db = getDB();
        if (!req.user) {
            apiRes.errorResponse(res, USER.accountNotExists);
            return;
        }

        const userId = req.user._id || req.user.id;
        const user: any = await db("users as u")
            .leftJoin("streamers as s", "s.user_id", "u.id")
            .select(
                // USER FIELDS
                "u.id",
                "u.nickname",
                "u.email_address",
                "u.avatar",
                "u.language",

                // STREAMER FIELDS
                "s.id as streamer_id",
                "s.unique_id",
                "s.thumbnail",
                "s.theme_description",
                "s.age",
                "s.height",
                "s.weight",
                "s.nationality",
                "s.attractive_body_part",
                "s.specialties",
                "s.cam2cam_special_service",
                "s.is_online"
            )
            .where("u.id", userId)
            .where("u.status", "!=", 2)
            .first();



        if (!user) {
            apiRes.errorResponse(res, USER.accountNotExists);
            return;
        }

        // Exclude password from response
        const { password_hash, otp_hash, ...userData } = user;
        apiRes.successResponseWithData(res, SUCCESS.dataFound, userData);
    } catch (error: any) {
        log(error.message);
        apiRes.errorResponse(res, ERROR.SomethingWrong);
        return;
    }
};

export const editProfile = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
        const db = getDB();

        if (!req.user) {
            apiRes.errorResponse(res, USER.accountNotExists);
            return;
        }

        const userId = req.user._id || req.user.id;

        const files = req.files as MulterFiles;

        const avatarFile = files.avatar?.[0];
        const thumbnailFile = files.thumbnail?.[0];

        const updateUser: any = { updated_at: db.fn.now() };
        const updateStreamer: any = { updated_at: db.fn.now() };

        if (req.body.nickname) {
            updateUser.nickname = req.body.nickname;
        }

        if (req.body.theme_description) {
            updateStreamer.theme_description = req.body.theme_description;
        }

        if (req.body.email_address || req.body.email) {
            const newEmail = (req.body.email_address || req.body.email).toLowerCase();

            const emailExists = await db("users")
                .where("email_address", newEmail)
                .where("id", "!=", userId)
                .where("status", "!=", 2)
                .first();

            if (emailExists) {
                apiRes.errorResponse(res, USER.emailAlreadyExists);
                return;
            }

            updateUser.email_address = newEmail;
            updateUser.email_verified = false;
        }

        if (avatarFile) {
            updateUser.avatar = avatarFile.path;
        }

        if (thumbnailFile) {
            updateStreamer.thumbnail = thumbnailFile.path;
        }

        await db("users").where("id", userId).update(updateUser);
        await db("streamers").where("user_id", userId).update(updateStreamer);

        const updated = await db("users").where("id", userId).first();
        const { password_hash, otp_hash, ...userData } = updated;

        apiRes.successResponseWithData(res, USER.profileUpdated, userData);
    } catch (error: any) {
        log(error.message);
        apiRes.errorResponse(res, ERROR.SomethingWrong);
        return;
    }
};

export const changePassword = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
        const db = getDB();
        const { oldPassword, newPassword, confirmPassword } = req.body;

        if (!req.user) {
            apiRes.errorResponse(res, USER.accountNotExists);
            return;
        }

        const userId = req.user._id || req.user.id;

        const result: any = await db('users').where('id', userId).first();

        if (!result || !(await PasswordService.verifyPassword(oldPassword, result.password_hash))) {
            apiRes.errorResponse(res, USER.oldPasswordInvalid)
            return;
        }

        if (newPassword !== confirmPassword) {
            apiRes.errorResponse(res, USER.passwordNotMatched)
            return;
        }

        const hash = await PasswordService.hashPassword(newPassword);
        await db('users')
            .where('id', userId)
            .update({ password_hash: hash, password_updated_at: db.fn.now(), updated_at: db.fn.now() });

        // Revoke all existing tokens and sessions (logout everywhere)
        await TokenService.revokeAllUserTokens(Number(userId), "Password changed");
        await SessionService.endAllUserSessions(Number(userId));

        apiRes.successResponse(res, STREAMER.passwordChanged);
    } catch (error: any) {
        log(error.message);
        apiRes.errorResponse(res, ERROR.SomethingWrong);
        return;
    }
};

export const refreshToken = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { refreshToken } = req.body;

        if (!refreshToken) {
            apiRes.errorResponse(res, "Refresh token is required.");
            return;
        }

        const db = getDB();
        const tokenHash = PasswordService.hashToken(refreshToken);

        const storedToken = await db("refresh_tokens")
            .where("token_hash", tokenHash)
            .where("is_active", true)
            .first();

        if (!storedToken) {
            apiRes.errorResponse(res, "Invalid refresh token.");
            return;
        }

        if (new Date(storedToken.expires_at) < new Date()) {
            apiRes.errorResponse(res, "Refresh token has expired.");
            return;
        }

        const isRevoked = await TokenService.isTokenRevoked(storedToken.jti);
        if (isRevoked) {
            apiRes.errorResponse(res, "Refresh token has been revoked.");
            return;
        }

        const userId = storedToken.user_id;

        const clientIp = getClientIp(req);
        const userAgent = getUserAgent(req);
        const { token: newRefreshToken, jti: newRefreshJti } = await TokenService.rotateRefreshToken(
            storedToken.jti,
            userId,
            null,
            clientIp,
            userAgent
        );

        const { token: accessToken } = TokenService.generateAccessToken(
            userId!,
            process.env.TOKEN_SECRET_KEY_3!,
            process.env.STREAMER_TOKEN_EXPIRE_TIME || "24h"
        );

        await db("session_tracking")
            .where("refresh_token_jti", storedToken.jti)
            .update({ refresh_token_jti: newRefreshJti, last_activity_at: db.fn.now() });

        apiRes.successResponseWithData(res, "Token refreshed successfully", {
            accessToken,
            refreshToken: newRefreshToken,
            expiresIn: process.env.STREAMER_TOKEN_EXPIRE_TIME || "24h"
        });
    } catch (error: any) {
        log(error.message);
        apiRes.errorResponse(res, ERROR.SomethingWrong);
        return;
    }
};

export const logout = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
        if (!req.user) {
            apiRes.errorResponse(res, STREAMER.accountNotExists);
            return;
        }

        const userId = req.user._id || req.user.id;
        const { refreshToken } = req.body;

        if (refreshToken) {
            const tokenHash = PasswordService.hashToken(refreshToken);
            const db = getDB();
            const storedToken = await db("refresh_tokens")
                .where("token_hash", tokenHash)
                .where("user_id", userId)
                .where("is_active", true)
                .first();

            if (storedToken) {
                await TokenService.revokeToken(
                    storedToken.jti,
                    Number(userId),
                    undefined,
                    { userId: Number(userId) },
                    "Streamer logout"
                );

                const session = await db("session_tracking")
                    .where("refresh_token_jti", storedToken.jti)
                    .where("is_active", true)
                    .first();

                if (session) {
                    await SessionService.endSession(session.id);
                }
            }
        } else {
            await TokenService.revokeAllUserTokens(Number(userId), "Streamer logout");
            await SessionService.endAllUserSessions(Number(userId));
        }

        apiRes.successResponse(res, STREAMER.logoutSuccess);
    } catch (error: any) {
        log(error.message);
        apiRes.errorResponse(res, ERROR.SomethingWrong);
        return;
    }
};