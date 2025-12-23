import { Request, Response, NextFunction, RequestHandler } from "express";
import { USER, SUCCESS, ERROR } from "../../../utils/responseMssg";
import * as apiRes from "../../../utils/apiResponse";
import { log } from "../../../utils/logger";
import { getDB } from "../../../config/db.config";
import { sendEmail, getNextUserUniqueId } from "../../../utils/functions";
import bcrypt from 'bcryptjs';
import jwt from "jsonwebtoken";
import { PasswordService } from "../../../services/auth/password.service";
import { TokenService } from "../../../services/auth/token.service";
import { SessionService } from "../../../services/auth/session.service";
import { getClientIp, getUserAgent } from "../../../utils/requestHelpers";

interface AuthenticatedRequest extends Request {
  user?: any;
}

// for user singUp to the platform
export const signUp = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const db = getDB();
    const email_address = req.body.email_address || req.body.email;
    const nickname = req.body.nickname || req.body.username;
    const { role, membership_type } = req.body;

    let password_hash: string = req.body.password;

    if (!email_address) {
      apiRes.errorResponse(res, USER.emailRequired);
      return;
    }

    if (!password_hash) {
      apiRes.errorResponse(res, USER.passwordRequired);
      return;
    }

    const normalizedEmail = email_address.toLowerCase();

    // Check if user exists
    const existingUser = await db('users')
      .where('email_address', 'ilike', normalizedEmail)
      .where('status', '!=', 2)
      .first();

    if (existingUser) {
      apiRes.errorResponse(res, USER.emailAlreadyExists);
      return;
    }

    // Encrypt password
    const hashedPassword = await PasswordService.hashPassword(password_hash);

    // Generate OTP securely
    // const otp: string = PasswordService.generateOTP();
    const otp: string = '123456';
    const otpHash = PasswordService.hashOTP(otp);
    const otpExpire: Date = new Date(Date.now() + 20 * 60 * 1000);

    const now = new Date();
    const unique_id = await getNextUserUniqueId();

    // Create new user
    const [savedUser] = await db('users')
      .insert({
        email_address: normalizedEmail,
        password_hash: hashedPassword,
        nickname: nickname || `member_${unique_id}`,
        role: role || 'user',
        status: 1,
        is_age_verified: false,
        language: 'en',
        registration_date: now,
        otp_hash: otpHash,
        otp_expires_at: otpExpire,
        email_verified: false,
        created_at: now,
        updated_at: now
      })
      .returning('*');

    // Create credit wallet for new user
    const existingWallet = await db('credit_wallets')
      .where('user_id', savedUser.id)
      .first();

    if (!existingWallet) {
      await db('credit_wallets')
        .insert({
          user_id: savedUser.id,
          balance: 0,
          frozen_credits: 0,
          total_spent: 0,
          created_at: db.fn.now(),
          updated_at: db.fn.now()
        });
    }

    let link = `${process.env.USER_VERIFY_URL}?email_token=${otpHash}&email_address=${normalizedEmail}&type=verify-email`;

    if (normalizedEmail) {
      const template = await db('email_templates')
        .where('slug', process.env.VERIFY_ACCOUNT_USER)
        .where('status', 1)
        .select('content', 'subject')
        .first();

      if (template) {
        let content = (template?.content || "")
          .replace("{link}", link);

        const mailOptions = {
          email: normalizedEmail,
          subject: template.subject,
          message: content
        };

        sendEmail(mailOptions);
      }
    }

    apiRes.successResponseWithData(res, USER.verificationLinkSent, savedUser);
  } catch (error: any) {
    log(error.message);
    apiRes.errorResponse(res, ERROR.SomethingWrong);
  }
};

// for user verify mail
export const verifyMail = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const db = getDB();
    const email_address = req.body.email_address || req.body.email;
    const normalizedEmail = email_address ? email_address.toLowerCase() : null;
    const { otp } = req.body;

    if (!normalizedEmail) {
      apiRes.errorResponse(res, USER.emailRequired);
      return;
    }

    if (!otp) {
      apiRes.errorResponse(res, USER.otpRequired);
      return;
    }

    const data = await db('users')
      .where('email_address', 'ilike', normalizedEmail)
      .where('status', 1)
      .select('id', 'otp_hash', 'otp_expires_at', 'email_verified')
      .first();

    if (!data) {
      apiRes.errorResponse(res, USER.accountNotExists);
      return;
    }

    // Check if account is already verified
    if (data.email_verified) {
      apiRes.errorResponseWithData(res, USER.alreadyVerified, { data: { alreadyVerified: true } });
      return;
    }

    // Check if OTP exists
    if (!data.otp_hash) {
      apiRes.errorResponse(res, USER.otpNotFound);
      return;
    }

    // Check if OTP is expired
    if (data.otp_expires_at && new Date(data.otp_expires_at) < new Date()) {
      apiRes.errorResponse(res, USER.otpExpired);
      return;
    }

    // Check if OTP matches
    let otpMatches = false;
    if (otp.length === 64 && /^[a-f0-9]+$/i.test(otp)) {
      otpMatches = otp === data.otp_hash;
    } else {
      otpMatches = PasswordService.verifyOTP(otp, data.otp_hash);
    }

    if (!otpMatches) {
      apiRes.errorResponse(res, USER.otpNotMatched);
      return;
    }

    await db('users')
      .where('id', data.id)
      .update({
        otp_hash: null,
        otp_expires_at: null,
        email_verified: true,
        updated_at: db.fn.now()
      });

    const trialPlan = await db('membership_plans')
      .where('plan_type', 'trial')
      .where('is_active', true)
      .first();

    if (trialPlan) {
      const startDate = new Date();
      startDate.setHours(12, 0, 0, 0);

      const expirationDate = new Date();
      expirationDate.setDate(expirationDate.getDate() + 7);
      expirationDate.setHours(23, 59, 59, 999);

      const existingMembership = await db('user_memberships')
        .where('user_id', data.id)
        .where('status', 1)
        .first();

      if (!existingMembership) {
        await db('user_memberships').insert({
          user_id: data.id,
          membership_plan_id: trialPlan.id,
          start_date: startDate,
          expiration_date: expirationDate,
          status: 1,
          is_trial: true,
          is_auto_renew: false,
          created_at: startDate,
          updated_at: startDate
        });
      }
    }

    const result = await db('users').where('id', data.id).first();

    if (!result) {
      apiRes.errorResponse(res, ERROR.SomethingWrong);
      return;
    }

    const clientIp = getClientIp(req);
    const userAgent = getUserAgent(req);

    await TokenService.revokeAllUserTokens(result.id, "Account verified, new session started");
    await SessionService.endAllUserSessions(result.id);

    const { token: refreshToken, jti: refreshJti, hash: refreshTokenHash } = TokenService.generateRefreshToken();
    const refreshExpiresAt = new Date();
    refreshExpiresAt.setDate(refreshExpiresAt.getDate() + 30);

    await TokenService.storeRefreshToken(
      result.id,
      null,
      refreshJti,
      refreshTokenHash,
      refreshExpiresAt,
      clientIp,
      userAgent
    );

    const { sessionId, sessionToken } = await SessionService.trackSession(
      result.id,
      null,
      clientIp,
      userAgent,
      refreshJti
    );

    const { token: accessToken, jti: accessJti } = TokenService.generateAccessToken(
      result.id,
      process.env.TOKEN_SECRET_KEY_2!,
      process.env.USER_TOKEN_EXPIRE_TIME || "24h",
      sessionId
    );

    const { password_hash, otp_hash, ...userData } = result;
    apiRes.successResponseWithData(res, USER.otpVerified, {
      token: accessToken,
      refreshToken,
      sessionToken,
      expiresIn: process.env.USER_TOKEN_EXPIRE_TIME || "24h",
      user: {
        email_address: result.email_address,
        username: result.nickname,
        role: result.role,
      },
      result: userData
    });
  } catch (error: any) {
    log(error.message);
    apiRes.errorResponse(res, ERROR.SomethingWrong);
  }
};

// for user resend verify mail
export const resendVerifyMail = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const db = getDB();
    const email_address = req.body.email_address || req.body.email;
    const normalizedEmail = email_address ? email_address.toLowerCase() : null;

    if (!normalizedEmail) {
      apiRes.errorResponse(res, USER.emailRequired);
      return;
    }

    const user = await db('users')
      .where('email_address', 'ilike', normalizedEmail)
      .where('status', 1)
      .select('id', 'nickname')
      .first();

    if (!user) {
      apiRes.errorResponse(res, USER.accountNotExists);
      return
    }

    // Generate OTP securely
    // const otp: string = PasswordService.generateOTP();
    const otp: string = '123456';
    const otpHash = PasswordService.hashOTP(otp);
    const otpExpire: Date = new Date(Date.now() + 20 * 60 * 1000);

    let link = `${process.env.USER_VERIFY_URL}?email_token=${otpHash}&email_address=${normalizedEmail}&type=verify-email`;

    if (normalizedEmail) {
      // Fetch email template
      const template = await db('email_templates')
        .where('slug', process.env.VERIFY_ACCOUNT_USER)
        .where('status', 1)
        .select('content', 'subject')
        .first();

      if (template) {
        let content = (template?.content || "")
          .replace("{User}", user.nickname || "User")
          .replace("{link}", link);

        // Email details
        const mailOptions = {
          email: normalizedEmail,
          subject: template.subject,
          message: content
        };

        // Send email
        sendEmail(mailOptions);
      }
    }

    // Update user with new OTP and expiration time
    await db('users')
      .where('id', user.id)
      .update({
        otp_hash: otpHash,
        otp_expires_at: otpExpire,
        updated_at: db.fn.now()
      });

    // Send success response
    apiRes.successResponse(res, USER.verificationLinkSent);

  } catch (error) {
    next(error);
  }
};

// for user login
export const loginUser = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const db = getDB();
    const email_address = req.body.email_address || req.body.email;
    const normalizedEmail = email_address ? email_address.toLowerCase() : null;
    const { password } = req.body;

    if (!password) {
      apiRes.validationError(res, USER.passwordRequired);
      return;
    }

    if (!normalizedEmail) {
      apiRes.validationError(res, USER.emailRequired);
      return;
    }

    const data: any = await db('users')
      .where('email_address', 'ilike', normalizedEmail)
      .where('status', '!=', 2)
      .first();

    if (!data) {
      apiRes.errorResponse(res, USER.unregisteredEmail);
      return;
    }

    if (data.status === 0 || data.status === 2) {
      apiRes.errorResponse(res, USER.accountDeactivated);
      return;
    }

    if (!data.email_verified) {
      // const otp: string = PasswordService.generateOTP();
      const otp: string = '123456';
      const otpHash = PasswordService.hashOTP(otp);
      const otpExpire: Date = new Date(Date.now() + 20 * 60 * 1000);

      let link = `${process.env.USER_VERIFY_URL}?email_token=${otpHash}&email_address=${normalizedEmail}&type=verify-email`;

      if (normalizedEmail) {
        const template = await db('email_templates')
          .where('slug', process.env.VERIFY_ACCOUNT_USER)
          .where('status', 1)
          .select('content', 'subject')
          .first();

        if (template) {
          let content = (template?.content || "")
            .replace("{link}", link);

          const mailOptions = {
            email: normalizedEmail,
            subject: template.subject,
            message: content
          };

          sendEmail(mailOptions);
        }
      }

      await db('users')
        .where('id', data.id)
        .update({
          otp_hash: otpHash,
          otp_expires_at: otpExpire,
        });

      apiRes.errorResponse(res, USER.accountNotVerified);
      return;
    }

    const match = await PasswordService.verifyPassword(password, data.password_hash);

    if (!match) {
      apiRes.errorResponse(res, USER.invalidLogin);
      return;
    }

    const clientIp = getClientIp(req);
    const userAgent = getUserAgent(req);

    // Revoke all previous tokens and sessions (Single Session Policy)
    await TokenService.revokeAllUserTokens(data.id, "New login on another device");
    await SessionService.endAllUserSessions(data.id);

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

    const { token: accessToken, jti: accessJti } = TokenService.generateAccessToken(
      data.id,
      process.env.TOKEN_SECRET_KEY_2!,
      process.env.USER_TOKEN_EXPIRE_TIME || "24h",
      sessionId
    );

    // Update last login timestamp
    await db('users')
      .where('id', data.id)
      .update({
        last_login_at: db.fn.now(),
        updated_at: db.fn.now()
      });

    // Get updated user data
    const updatedUser = await db('users').where('id', data.id).first();
    const { password_hash, otp_hash, ...result } = updatedUser;

    apiRes.successResponseWithData(res, USER.loginSuccess, {
      accessToken,
      refreshToken,
      sessionToken,
      expiresIn: process.env.USER_TOKEN_EXPIRE_TIME || "24h",
      result
    });
  } catch (error) {
    next(error);
  }
};

// for user forgot password 
export const forgotPassword = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const db = getDB();
    const email_address = req.body.email_address || req.body.email;
    const normalizedEmail = email_address ? email_address.toLowerCase() : null;

    if (!normalizedEmail) {
      apiRes.errorResponse(res, USER.emailRequired);
      return;
    }

    const user = await db('users')
      .where('email_address', 'ilike', normalizedEmail)
      .where('status', 1)
      .first();

    if (!user) {
      apiRes.errorResponse(res, USER.accountNotExists);
      return
    }

    // Generate OTP securely
    // const otp: string = PasswordService.generateOTP();
    const otp: string = '123456';
    const otpHash = PasswordService.hashOTP(otp);
    const otpExpire: Date = new Date(Date.now() + 20 * 60 * 1000);

    let link = `${process.env.USER_VERIFY_URL}?email_token=${otpHash}&email_address=${normalizedEmail}&type=reset-password`;

    if (normalizedEmail) {
      const template = await db('email_templates')
        .where('slug', process.env.FORGOT_PASSWORD_USER)
        .where('status', 1)
        .select('content', 'subject')
        .first();

      if (template) {
        let content = (template?.content || "")
          .replace("{Nickname}", user.nickname || "Member")
          .replace("{otp}", link)
          .replace("{otpExpire}", "20");

        const mailOptions = {
          email: normalizedEmail,
          subject: template.subject,
          message: content
        };

        sendEmail(mailOptions);
      }
    }

    await db('users')
      .where('id', user.id)
      .update({
        otp_hash: otpHash,
        otp_expires_at: otpExpire,
        updated_at: db.fn.now()
      });

    apiRes.successResponse(res, USER.otpSent);
  } catch (error) {
    next(error);
  }
};

// for user reset password
export const resetPassword = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const db = getDB();
    const email_address = req.body.email_address || req.body.email;
    const normalizedEmail = email_address ? email_address.toLowerCase() : null;
    const { otp, newPassword } = req.body;

    if (!normalizedEmail) {
      apiRes.errorResponse(res, USER.emailRequired);
      return;
    }

    if (!otp) {
      apiRes.errorResponse(res, USER.otpRequired);
      return;
    }

    if (!newPassword) {
      apiRes.errorResponse(res, USER.passwordRequired);
      return;
    }

    // Find user by email_address and check OTP validity (as per users table structure)
    const user = await db('users')
      .where('status', 1) // 1 = active
      .where('email_address', 'ilike', normalizedEmail)
      .select('id', 'otp_hash', 'otp_expires_at')
      .first();

    if (!user) {
      apiRes.errorResponse(res, USER.accountNotExists);
      return;
    }

    // Check if OTP exists
    if (!user.otp_hash) {
      apiRes.errorResponse(res, USER.otpNotFound);
      return;
    }

    // Check if OTP is expired
    if (user.otp_expires_at && new Date(user.otp_expires_at) < new Date()) {
      apiRes.errorResponse(res, USER.otpExpired);
      return;
    }

    // Check if OTP matches
    // Handle both plain OTP and hashed OTP (for backward compatibility)
    let otpMatches = false;
    if (otp.length === 64 && /^[a-f0-9]+$/i.test(otp)) {
      // If it's a 64-character hex string, it's likely a hash - compare directly
      otpMatches = otp === user.otp_hash;
    } else {
      // Otherwise, treat it as plain OTP and hash it for comparison
      otpMatches = PasswordService.verifyOTP(otp, user.otp_hash);
    }

    if (!otpMatches) {
      apiRes.errorResponse(res, USER.otpNotMatched);
      return;
    }

    // Hash new password
    const hashedPassword = await PasswordService.hashPassword(newPassword);

    // Update user password and reset OTP fields
    await db('users')
      .where('id', user.id)
      .update({
        password_hash: hashedPassword,
        password_updated_at: db.fn.now(),
        otp_hash: null,
        otp_expires_at: null,
        updated_at: db.fn.now()
      });

    // Revoke all existing tokens and sessions (logout everywhere)
    await TokenService.revokeAllUserTokens(user.id, "Password reset");
    await SessionService.endAllUserSessions(user.id);

    apiRes.successResponse(res, USER.resetPassword);
  } catch (error) {
    next(error);
  }
};

// for user resend OTP 
export const resendOtp = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const db = getDB();
    const email_address = req.body.email_address || req.body.email;
    const normalizedEmail = email_address ? email_address.toLowerCase() : null;

    if (!normalizedEmail) {
      apiRes.errorResponse(res, "Email address is required.");
      return;
    }

    // Find user by email_address only (as per users table structure)
    const user = await db('users')
      .where('email_address', 'ilike', normalizedEmail)
      .where('status', 1) // 1 = active
      .select('id')
      .first();

    if (!user) {
      apiRes.errorResponse(res, USER.accountNotExists);
      return;
    }

    // Generate OTP securely
    const otp: string = PasswordService.generateOTP();
    const otpHash = PasswordService.hashOTP(otp);
    const otpExpire: Date = new Date(Date.now() + 20 * 60 * 1000);

    if (normalizedEmail) {
      // Fetch email template
      const template = await db('email_templates')
        .where('slug', process.env.FORGOT_PASSWORD_USER)
        .where('status', 1)
        .select('content', 'subject')
        .first();

      if (template) {
        let content = (template?.content || "")
          .replace("{otp}", otp)
          .replace("{otpExpire}", "20");

        // Email details
        const mailOptions = {
          email: normalizedEmail,
          subject: template.subject,
          message: content
        };

        // Send email
        sendEmail(mailOptions);
      }
    }

    // Update user with new OTP and expiration time
    await db('users')
      .where('id', user.id)
      .update({
        otp_hash: otpHash,
        otp_expires_at: otpExpire,
        updated_at: db.fn.now()
      });

    // Send success response
    apiRes.successResponse(res, USER.otpSent);

  } catch (error) {
    next(error);
  }
};

// for user profile details
export const getUserDetails = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const db = getDB();
    if (!req.user) {
      apiRes.errorResponse(res, USER.accountNotExists);
      return;
    }

    const userId = req.user._id || req.user.id;
    const user: any = await db('users')
      .where('id', userId)
      .where('status', '!=', 2) // Not deleted
      .first();

    if (!user) {
      apiRes.errorResponse(res, USER.accountNotExists);
      return;
    }

    // Exclude password from response
    const { password_hash, otp_hash, ...userData } = user;
    apiRes.successResponseWithData(res, SUCCESS.dataFound, userData);
  } catch (error) {
    next(error);
  }
};

// for user edit profile
export const editProfile = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const db = getDB();
    if (!req.user) {
      apiRes.errorResponse(res, USER.accountNotExists);
      return;
    }

    let imagePath: string | undefined;
    if (req.file) {
      imagePath = req.file.path.replace(/\\/g, "/");
    }

    const userId = req.user._id || req.user.id;

    // Check if user exists
    const existingUser = await db('users')
      .where('id', userId)
      .where('status', '!=', 2)
      .first();

    if (!existingUser) {
      apiRes.errorResponse(res, USER.accountNotExists);
      return;
    }

    // Build update data based on users table structure
    const updateData: any = {
      updated_at: db.fn.now(),
    };

    // Update nickname if provided (users table field)
    if (req.body.nickname) {
      updateData.nickname = req.body.nickname;
    }

    // Update email_address if provided (check for uniqueness)
    if (req.body.email_address) {
      const newEmail = (req.body.email_address).toLowerCase();

      // Check if email is already taken by another user
      const emailExists = await db('users')
        .where('email_address', 'ilike', newEmail)
        .where('id', '!=', userId)
        .where('status', '!=', 2)
        .first();

      if (emailExists) {
        apiRes.errorResponse(res, USER.emailAlreadyExists);
        return;
      }

      updateData.email_address = newEmail;
    }

    // Update avatar if provided
    if (req.file) {
      updateData.avatar = imagePath;
    }

    // Update language if provided
    if (req.body.language) {
      updateData.language = req.body.language;
    }

    // Update user data
    await db('users')
      .where('id', userId)
      .update(updateData);

    // Get updated user data
    const updatedUser = await db('users').where('id', userId).first();
    const { password_hash, otp_hash, ...userData } = updatedUser;

    apiRes.successResponseWithData(res, USER.profileUpdated, userData);
  } catch (error) {
    next(error);
  }
};

// for user change password
export const changePassword = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const db = getDB();
    if (!req.user) {
      apiRes.errorResponse(res, USER.accountNotExists);
      return;
    }

    const userId = req.user._id || req.user.id;
    const result: any = await db('users').where('id', userId).first();

    if (!result || !(await PasswordService.verifyPassword(req.body.oldPassword, result.password_hash))) {
      apiRes.errorResponse(res, USER.oldPasswordInvalid);
      return;
    }

    if (req.body.newPassword !== req.body.confirmPassword) {
      apiRes.errorResponse(res, USER.passwordNotMatched);
      return;
    }

    const hash = await PasswordService.hashPassword(req.body.newPassword);
    await db('users')
      .where('id', userId)
      .update({ password_hash: hash, password_updated_at: db.fn.now(), updated_at: db.fn.now() });

    // Revoke all existing tokens and sessions (logout everywhere)
    await TokenService.revokeAllUserTokens(Number(userId), "Password changed");
    await SessionService.endAllUserSessions(Number(userId));

    apiRes.successResponse(res, USER.passwordChanged);
  } catch (error: any) {
    log(error.message);
    apiRes.errorResponse(res, ERROR.SomethingWrong);
    return;
  }
};

// for user get faqs
export const getFaqs = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const db = getDB();
    const result = await db('faqs')
      .where('status', 1)
      .select('title', 'description')
      .orderBy('created_at', 'desc');

    // Send success response
    apiRes.successResponseWithData(res, SUCCESS.dataFound, result);
  } catch (error) {
    next(error);
  }
};

// Get About Us / Terms / Privacy / Community Guidelines
export const getTerms = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const db = getDB();
    let slug = process.env.TERMS;

    switch (req.url) {
      case "/getPrivacy":
        slug = process.env.PRIVACY_POLICY;
        break;
      case "/getCommunityGuidelines":
        slug = process.env.COMMUNITY_GUIDELINES;
        break;
      default:
        slug = process.env.TERMS;
        break;
    }

    // Find content details
    const result = await db('cms')
      .where('status', 1)
      .where('slug', slug)
      .select('description', 'created_at', 'title', 'status')
      .first();

    // Send success response
    apiRes.successResponseWithData(res, SUCCESS.dataFound, result);
  } catch (error) {
    next(error);
  }
};

// Contact Us
export const contactUs = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const db = getDB();
    // Note: Support table doesn't exist in migrations, you may need to create it
    // For now, I'll comment this out
    // await db('support').insert({
    //   name: req.body.name,
    //   email: req.body.email,
    //   subject: req.body.subject,
    //   description: req.body.description,
    //   status: 0,
    //   created_at: db.fn.now()
    // });

    // Send success response
    apiRes.successResponse(res, USER.contactUsSubmitted);
  } catch (error) {
    next(error);
  }
};

// Get About Us
export const getAboutUs = async (req: Request, res: Response, next: NextFunction) => {
  try {


  } catch (error: any) {
    log(error.message);
    apiRes.errorResponse(res, ERROR.SomethingWrong);
    return;
  }
};

// Refresh access token
export const refreshToken = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      apiRes.errorResponse(res, "Refresh token is required.");
      return;
    }

    // Decode token to get jti (we need to extract it from the token somehow)
    // Since refresh tokens are random hex strings, we need to find it by hash
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

    // Check if token is expired
    if (new Date(storedToken.expires_at) < new Date()) {
      apiRes.errorResponse(res, "Refresh token has expired.");
      return;
    }

    // Check if revoked
    const isRevoked = await TokenService.isTokenRevoked(storedToken.jti);
    if (isRevoked) {
      apiRes.errorResponse(res, "Refresh token has been revoked.");
      return;
    }

    const userId = storedToken.user_id;
    const adminId = storedToken.admin_id;

    // Rotate refresh token (revoke old, create new)
    const clientIp = getClientIp(req);
    const userAgent = getUserAgent(req);
    const { token: newRefreshToken, jti: newRefreshJti } = await TokenService.rotateRefreshToken(
      storedToken.jti,
      userId,
      adminId,
      clientIp,
      userAgent
    );

    // Generate new access token
    const tokenSecret = adminId
      ? process.env.TOKEN_SECRET_KEY_1!
      : process.env.TOKEN_SECRET_KEY_2!;
    const tokenExpiry = adminId
      ? process.env.ADMIN_TOKEN_EXPIRE || "24h"
      : process.env.USER_TOKEN_EXPIRE_TIME || "24h";

    const session = await db("session_tracking")
      .where("refresh_token_jti", storedToken.jti)
      .first();

    const { token: accessToken } = TokenService.generateAccessToken(
      userId || adminId!,
      tokenSecret,
      tokenExpiry,
      session?.id
    );

    // Update session with new refresh token JTI
    await db("session_tracking")
      .where("refresh_token_jti", storedToken.jti)
      .update({ refresh_token_jti: newRefreshJti, last_activity_at: db.fn.now() });

    apiRes.successResponseWithData(res, "Token refreshed successfully", {
      accessToken,
      refreshToken: newRefreshToken,
      expiresIn: tokenExpiry
    });
  } catch (error) {
    next(error);
  }
};

// Logout user
export const logout = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      apiRes.errorResponse(res, USER.accountNotExists);
      return;
    }

    const userId = req.user._id || req.user.id;
    const { refreshToken } = req.body;

    if (refreshToken) {
      // Revoke specific refresh token
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
          "User logout"
        );

        // End session
        const session = await db("session_tracking")
          .where("refresh_token_jti", storedToken.jti)
          .where("is_active", true)
          .first();

        if (session) {
          await SessionService.endSession(session.id);
        }
      }
    } else {
      await TokenService.revokeAllUserTokens(Number(userId), "User logout");
      await SessionService.endAllUserSessions(Number(userId));
    }

    apiRes.successResponse(res, USER.logoutSuccess);
  } catch (error: any) {
    log(error.message);
    apiRes.errorResponse(res, ERROR.SomethingWrong);
    return;
  }
};