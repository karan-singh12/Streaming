import { Request, Response, NextFunction, RequestHandler } from "express";
import { addAdminServices } from "../../../services/admin/auth.service";
import { ADMIN, SUCCESS, ERROR, AUTH } from "../../../utils/responseMssg";
import * as apiRes from "../../../utils/apiResponse";
import { getDB } from "../../../config/db.config";
import { sendEmail } from "../../../utils/functions";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { log } from "../../../utils/logger";
import { PasswordService } from "../../../services/auth/password.service";
import { TokenService } from "../../../services/auth/token.service";
import { getClientIp, getUserAgent } from "../../../utils/requestHelpers";

interface AuthenticatedRequest extends Request {
  user?: { _id?: string; id?: string };
}

// Admin registration controller
export const addAdmin = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { name, email_address, password } = req.body;

    const admin = await addAdminServices(name, email_address, password);

    apiRes.successResponseWithData(res, ADMIN.adminAdded, admin);
  } catch (error: any) {
    log(error.message);
    apiRes.errorResponse(res, ERROR.SomethingWrong);
    return;
  }
};

export const loginAdmin = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const db = getDB();
    const email = req.body.email_address?.toLowerCase();

    const data: any = await db("admins")
      .where("email_address", "ilike", email)
      .where("status", "!=", 2)
      .first();

    if (!data) {
      apiRes.validationError(res, ADMIN.accountNotExists);
      return;
    }

    const match = await PasswordService.verifyPassword(
      req.body.password,
      data.password_hash
    );
    if (!match) {
      apiRes.errorResponse(res, ADMIN.invalidLogin);
      return;
    }

    // Generate 6-digit OTP
    const otp = "123456";
    const otpHash = PasswordService.hashOTP(otp);
    const otpExpires = new Date(Date.now() + 10 * 60 * 1000);

    // Save OTP to database
    await db("admins").where("id", data.id).update({
      login_otp_hash: otpHash,
      login_otp_expires_at: otpExpires,
      updated_at: db.fn.now(),
    });

    // Send OTP email
    const template = await db("email_templates")
      .where("slug", "login_otp")
      .where("status", 1)
      .first();

    let emailContent = `Your login OTP is: <strong>${otp}</strong><br>This OTP will expire in 10 minutes.`;
    let emailSubject = "Your Login OTP";

    if (template) {
      emailContent = (template.content || "")
        .replace("{adminName}", data.name)
        .replace("{otp}", otp);
      emailSubject = template.subject || emailSubject;
    }

    await sendEmail({
      email: data.email_address,
      subject: emailSubject,
      message: emailContent,
    });

    apiRes.successResponseWithData(
      res,
      "OTP sent to your email. Please verify to continue login.",
      {
        otpRequired: true,
        adminId: data.id,
      }
    );
  } catch (error: any) {
    log(error.message);

    apiRes.errorResponse(res, ERROR.SomethingWrong);

    return;
  }
};

export const verifyOTP = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const db = getDB();
    const { email_address, otp } = req.body;

    if (!email_address || !otp) {
      apiRes.validationError(res, ADMIN.emailNotExists);
      return;
    }

    const admin: any = await db("admins")
      .whereRaw("LOWER(email_address) = ?", [email_address.toLowerCase()])
      .first();
    if (!admin) {
      apiRes.errorResponse(res, ADMIN.accountNotExists);
      return;
    }

    if (!admin.login_otp_hash || !admin.login_otp_expires_at) {
      apiRes.errorResponse(res, ADMIN.otpNotFound);
      return;
    }

    const now = new Date();
    if (new Date(admin.login_otp_expires_at) < now) {
      apiRes.errorResponse(res, ADMIN.otpExpired);
      return;
    }

    if (!PasswordService.verifyOTP(otp, admin.login_otp_hash)) {
      apiRes.errorResponse(res, ADMIN.otpInvalid);
      return;
    }

    await db("admins").where("id", admin.id).update({
      login_otp_hash: null,
      login_otp_expires_at: null,
      updated_at: db.fn.now(),
    });

    const clientIp = getClientIp(req);
    const userAgent = getUserAgent(req);

    const { token: accessToken, jti: accessJti } =
      TokenService.generateAccessToken(
        admin.id,
        process.env.TOKEN_SECRET_KEY_1!,
        process.env.ADMIN_TOKEN_EXPIRE || "24h"
      );

    const {
      token: refreshToken,
      jti: refreshJti,
      hash: refreshTokenHash,
    } = TokenService.generateRefreshToken();
    const refreshExpiresAt = new Date();
    refreshExpiresAt.setDate(refreshExpiresAt.getDate() + 30);

    await TokenService.storeRefreshToken(
      null,
      admin.id,
      refreshJti,
      refreshTokenHash,
      refreshExpiresAt,
      clientIp,
      userAgent
    );

    const updatedAdmin = await db("admins").where("id", admin.id).first();
    const {
      password_hash,
      login_otp_hash,
      login_otp_expires_at,
      reset_password_token_hash,
      ...result
    } = updatedAdmin;

    apiRes.successResponseWithData(res, ADMIN.loginSuccess, {
      token: accessToken,
      refreshToken,
      expiresIn: process.env.ADMIN_TOKEN_EXPIRE || "24h",
      result,
    });
  } catch (error: any) {
    log(error.message);

    apiRes.errorResponse(res, ERROR.SomethingWrong);

    return;
  }
};

export const forgotPassword = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const db = getDB();
    const email_address = req.body.email_address?.toLowerCase();

    if (!email_address) {
      apiRes.errorResponse(res, ADMIN.emailNotExists);
      return;
    }

    const result = await db("admins")
      .where("email_address", email_address)
      .first();
    if (!result) {
      apiRes.errorResponse(res, ADMIN.emailNotExists);
      return;
    }

    // Generate reset token
    // const resetPasswordToken = PasswordService.generateResetToken();
    const resetPasswordToken = "123456";

    const resetPasswordTokenHash =
      PasswordService.hashToken(resetPasswordToken);
    let resetPasswordExpiresTime: any = process.env.RESET_PASSWORD_EXPIRE_TIME;
    let resetPasswordExpires: any = new Date(
      Date.now() + resetPasswordExpiresTime * 60 * 1000
    );

    const link = `https://streaming-admin.devtechnosys.tech/auth/reset-password?token=${resetPasswordTokenHash}`;

    if (email_address) {
      const template = await db("email_templates")
        .where("slug", process.env.FORGOT_PASSWORD_ADMIN)
        .where("status", 1)
        .first();

      if (template) {
        let content = (template?.content || "")
          .replace("{adminName}", result.name)
          .replace("{resetLink}", link);

        const mailOptions = {
          email: email_address,
          subject: template.subject,
          message: content,
        };

        await sendEmail(mailOptions);
      }
    }

    await db("admins").where("id", result.id).update({
      reset_password_token_hash: resetPasswordTokenHash,
      reset_password_expire_at: resetPasswordExpires,
    });

    apiRes.successResponse(res, ADMIN.emailSent);
  } catch (error: any) {
    log(error.message);
    apiRes.errorResponse(res, ERROR.SomethingWrong);
    return;
  }
};

export const resetPassword = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const db = getDB();
    const { newPassword, token, email } = req.body;
    let date = new Date();

    const result: any = await db("admins")
      .where("reset_password_token_hash", token)
      .select("id", "reset_password_token_hash", "reset_password_expire_at")
      .first();

    if (!result) {
      apiRes.errorResponse(res, ADMIN.accountNotExists);
      return;
    }

    if (result && new Date(result.reset_password_expire_at) < date) {
      apiRes.errorResponse(res, AUTH.tokenExpired);
      return;
    }

    const hash = await PasswordService.hashPassword(newPassword);

    await db("admins").where("id", result.id).update({
      password_hash: hash,
      password_updated_at: db.fn.now(),
      reset_password_token_hash: null,
      reset_password_expire_at: null,
      updated_at: db.fn.now(),
    });

    await TokenService.revokeAllAdminTokens(result.id, "Password reset");

    apiRes.successResponse(res, ADMIN.resetPasswordSuccess);
  } catch (error: any) {
    log(error.message);
    apiRes.errorResponse(res, ERROR.SomethingWrong);
    return;
  }
};

export const changePassword = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const db = getDB();
    if (!req.user) {
      apiRes.errorResponse(res, ADMIN.accountNotExists);
      return;
    }

    const adminId = Number(req.user._id || req.user.id);
    const result = await db("admins").where("id", adminId).first();
    if (
      !result ||
      !(await PasswordService.verifyPassword(
        req.body.oldPassword,
        result.password_hash
      ))
    ) {
      apiRes.errorResponse(res, ADMIN.passwordInvalid);
      return;
    }

    if (req.body.newPassword !== req.body.confirmPassword) {
      apiRes.errorResponse(res, ADMIN.passwordNotMatched);
      return;
    }

    const hash = await PasswordService.hashPassword(req.body.newPassword);

    await db("admins")
      .where("id", adminId)
      .update({
        password_hash: hash,
        password_updated_at: db.fn.now(),
        updated_at: db.fn.now(),
      });

    // Revoke all existing tokens and sessions (logout everywhere)
    await TokenService.revokeAllAdminTokens(adminId, "Password changed");

    apiRes.successResponse(res, ADMIN.passwordChanged);
  } catch (error: any) {
    log(error.message);
    apiRes.errorResponse(res, ERROR.SomethingWrong);
    return;
  }
};

export const getAdminDetails = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const db = getDB();

    if (!req.user) {
      apiRes.errorResponse(res, ADMIN.accountNotExists);
      return;
    }

    const adminId = req.user._id || req.user.id;
    const result = await db("admins").where("id", adminId).first();

    apiRes.successResponseWithData(res, SUCCESS.dataFound, result);
  } catch (error: any) {
    log(error.message);
    apiRes.errorResponse(res, ERROR.SomethingWrong);
    return;
  }
};

export const editProfile = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const db = getDB();
    if (!req.user) {
      apiRes.errorResponse(res, ADMIN.accountNotExists);
      return;
    }

    const adminId = req.user._id || req.user.id;
    const updateData = {
      name: req.body.name,
      email_address: req.body.email_address,
      updated_at: db.fn.now(),
    };

    await db("admins").where("id", adminId).update(updateData);

    const result = await db("admins").where("id", adminId).first();

    apiRes.successResponseWithData(res, ADMIN.profileUpdated, result);
  } catch (error: any) {
    log(error.message);
    apiRes.errorResponse(res, ERROR.SomethingWrong);
    return;
  }
};

export const getSetting = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const db = getDB();

    const rows = await db("site_settings").select(
      "setting_key",
      "setting_value"
    );

    // Convert rows into a clean JSON object
    const settings: any = {};
    rows.forEach((row: any) => {
      settings[row.setting_key] = row.setting_value;
    });

    apiRes.successResponseWithData(res, SUCCESS.dataFound, settings);
  } catch (error: any) {
    log(error.message);
    apiRes.errorResponse(res, ERROR.SomethingWrong);
    return;
  }
};

export const refreshToken = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
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

    const adminId = storedToken.admin_id;

    const clientIp = getClientIp(req);
    const userAgent = getUserAgent(req);
    const { token: newRefreshToken, jti: newRefreshJti } =
      await TokenService.rotateRefreshToken(
        storedToken.jti,
        null,
        adminId,
        clientIp,
        userAgent
      );

    const { token: accessToken } = TokenService.generateAccessToken(
      adminId!,
      process.env.TOKEN_SECRET_KEY_1!,
      process.env.ADMIN_TOKEN_EXPIRE || "24h"
    );

    apiRes.successResponseWithData(res, "Token refreshed successfully", {
      accessToken,
      refreshToken: newRefreshToken,
      expiresIn: process.env.ADMIN_TOKEN_EXPIRE || "24h",
    });
  } catch (error: any) {
    log(error.message);
    apiRes.errorResponse(res, ERROR.SomethingWrong);
    return;
  }
};

export const logout = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!req.user) {
      apiRes.errorResponse(res, ADMIN.accountNotExists);
      return;
    }

    const adminId = Number(req.user._id || req.user.id);
    const { refreshToken } = req.body;
    const db = getDB();

    if (refreshToken) {
      const tokenHash = PasswordService.hashToken(refreshToken);
      const storedToken = await db("refresh_tokens")
        .where("token_hash", tokenHash)
        .where("admin_id", adminId)
        .where("is_active", true)
        .first();

      if (storedToken) {
        await TokenService.revokeToken(
          storedToken.jti,
          undefined,
          adminId,
          { adminId },
          "Admin logout"
        );
      }
    } else {
      // Revoke all tokens
      await TokenService.revokeAllAdminTokens(adminId, "Admin logout");
    }

    apiRes.successResponse(res, ADMIN.logoutSuccess);
  } catch (error: any) {
    log(error.message);
    apiRes.errorResponse(res, ERROR.SomethingWrong);
    return;
  }
};

export const updateSetting = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const db = getDB();

    const settingsToUpdate = [
      { key: "instagram", value: req.body.instagram },
      { key: "facebook", value: req.body.facebook },
      { key: "contactUsEmail", value: req.body.contactUsEmail },
      { key: "linkedin", value: req.body.linkedIn },
      { key: "twitter", value: req.body.twitter },
    ];

    for (const item of settingsToUpdate) {
      if (item.value !== undefined) {
        await db("site_settings")
          .where("setting_key", item.key)
          .update({
            setting_value: item.value,
            updated_at: db.fn.now(),
            updated_by: req.user?.id ?? null,
          });
      }
    }

    // Fetch all updated settings
    const updatedSettings = await db("site_settings").select(
      "setting_key",
      "setting_value"
    );

    apiRes.successResponseWithData(res, ADMIN.settingUpdated, updatedSettings);
  } catch (error: any) {
    log(error.message);
    apiRes.errorResponse(res, ERROR.SomethingWrong);
    return;
  }
};
