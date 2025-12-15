import { NextFunction, Request, Response } from 'express'
import asyncHandler from 'express-async-handler'
import { ERROR, MODEL, SUCCESS, USER } from '../../../utils/responseMssg'
import { getDB } from '../../../config/db.config';
import * as apiRes from '../../../utils/apiResponse';
import bcrypt from "bcryptjs";
import { sendEmail, getNextModelUniqueId, deleteMulterFile, deleteUploadedFile } from '../../../utils/functions'
import { log } from '../../../utils/logger'
import { PasswordService } from '../../../services/auth/password.service';

interface AuthenticateRequest extends Request {
  user?: any
}

export const addStreamer = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const db = getDB();
    const email_address = req.body.email_address?.toLowerCase();
    const { nickname, password, status } = req.body;
    const image = req.file?.path;

    if (!email_address) {
      if (req.file) await deleteMulterFile(req.file);
      apiRes.errorResponse(res, "Email address required.")
      return
    }

    if (!password) {
      if (req.file) await deleteMulterFile(req.file);
      apiRes.errorResponse(res, "Password required.")
      return
    }

    const existingUser = await db('users')
      .where('email_address', 'ilike', email_address)
      .where('status', '!=', 2)
      .first();

    if (existingUser) {
      if (req.file) await deleteMulterFile(req.file);

      // Check if this user already has a streamer profile
      const existingStreamer = await db('streamers')
        .where('user_id', existingUser.id)
        .first();

      if (existingStreamer) {
        apiRes.errorResponse(res, "Streamer profile already exists for this email address.")
        return
      }

      apiRes.errorResponse(res, "Email address already exists in the system.")
      return
    }

    const uniqueId = await getNextModelUniqueId();
    const hashPassword = await PasswordService.hashPassword(password);
    const now = new Date();

    const [savedUser] = await db('users')
      .insert({
        email_address: email_address,
        password_hash: hashPassword,
        nickname: nickname || `streamer_${Date.now()}`,
        role: 'streamer',
        status: status || 1,
        avatar: image || null,
        is_age_verified: false,
        language: 'en',
        registration_date: now,
        email_verified: false,
        created_at: now,
        updated_at: now
      })
      .returning('*');

    const [saveModel] = await db('streamers')
      .insert({
        user_id: savedUser.id,
        unique_id: uniqueId,
        thumbnail: image || null,
        theme_description: null,
        is_online: false,
        current_room_type: null,
        created_at: now,
        updated_at: now
      })
      .returning('*');

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

    const templateResult = await db('email_templates')
      .where('slug', process.env.USER_SEND_PASSWORD)
      .where('status', 1)
      .first();

    if (templateResult) {
      let content = templateResult.content
        .replace("{username}", savedUser.nickname ?? "")
        .replace("{email}", email_address ?? "")
        .replace("{password}", password);
      sendEmail({ email: email_address ?? "", subject: templateResult.subject, message: content });
    }

    const result = {
      ...saveModel,
      user: {
        id: savedUser.id,
        email_address: savedUser.email_address,
        nickname: savedUser.nickname,
        avatar: savedUser.avatar,
        role: savedUser.role,
        status: savedUser.status
      }
    };

    apiRes.successResponseWithData(res, MODEL.modelAdded, result);

  } catch (error: any) {
    log(error.message);
    if (req.file) await deleteMulterFile(req.file);
    apiRes.errorResponse(res, ERROR.SomethingWrong);
    return;
  }
};

export const getAllStreamers = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const db = getDB();
    const { pageSize, pageNumber, searchItem, status } = req.body;
    const offset = (pageNumber - 1) * pageSize;

    let query = db('streamers')
      .join('users', 'streamers.user_id', 'users.id')
      .where('users.role', 'streamer')
      .where('users.status', '!=', 2);

    if (status && Array.isArray(status) && status.length > 0) {
      const statusNumbers = status.map((s: any) => Number(s)).filter((s: number) => !isNaN(s) && s !== 2);

      if (statusNumbers.length > 0) {
        query = query.whereIn('users.status', statusNumbers);
      }
    }

    if (searchItem) {
      query = query.where(function () {
        this.where('users.nickname', 'ilike', `%${searchItem}%`)
          .orWhere('users.email_address', 'ilike', `%${searchItem}%`)
          .orWhere('streamers.unique_id', 'ilike', `%${searchItem}%`);
      });
    }

    const totalRecords = await query.clone().count('* as count').first();
    const total = totalRecords ? Number(totalRecords.count) : 0;

    const result = await query
      .select(
        'streamers.id',
        'streamers.user_id',
        'streamers.unique_id as uniqueId',
        'streamers.thumbnail',
        'streamers.theme_description',
        'streamers.is_online',
        'streamers.current_room_type',
        'users.nickname as username',
        'users.email_address as email',
        'users.avatar',
        'users.status',
        'users.registration_date',
        'streamers.created_at',
        'streamers.updated_at'
      )
      .orderBy('streamers.created_at', 'desc')
      .limit(pageSize)
      .offset(offset);

    apiRes.successResponseWithData(res, SUCCESS.dataFound, { result, totalRecords: total, pageNumber, pageSize });
  } catch (error: any) {
    log(error.message);
    apiRes.errorResponse(res, ERROR.SomethingWrong);
    return;
  }
};

export const getOneStreamer = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const db = getDB();
    const { id } = req.params;

    if (!id) {
      apiRes.errorResponse(res, "Streamer id required.")
      return
    }

    const model = await db('streamers')
      .join('users', 'streamers.user_id', 'users.id')
      .where('streamers.id', parseInt(id))
      .select(
        'streamers.id',
        'streamers.user_id',
        'streamers.unique_id as uniqueId',
        'streamers.thumbnail as image',
        'streamers.theme_description as bio',
        'streamers.age',
        'streamers.height',
        'streamers.weight',
        'streamers.nationality',
        'streamers.attractive_body_part',
        'streamers.specialties',
        'streamers.cam2cam_special_service',
        'streamers.is_online',
        'streamers.current_room_type',
        'users.nickname as username',
        'users.email_address as email',
        'users.language as languages',
        'users.avatar',
        'users.status',
        'users.registration_date',
        'streamers.created_at',
        'streamers.updated_at'
      )
      .first();

    if (!model) {
      apiRes.errorResponse(res, "Streamer not found.")
      return
    }

    apiRes.successResponseWithData(res, SUCCESS.dataFound, model);
  } catch (error: any) {
    log(error.message);
    apiRes.errorResponse(res, ERROR.SomethingWrong);
    return;
  }
};

export const changeStatus = async (req: AuthenticateRequest, res: Response, next: NextFunction) => {
  try {
    const db = getDB();
    if (!req.body.id) {
      apiRes.errorResponse(res, "Streamer id required.")
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

    let message = req.body.status === 1 ? "Streamer Activate SuccessFully." : req.body.status === 2 ? "Streamer Delete SuccessFully." : "Streamer Deactivate SucessFully."
    apiRes.successResponse(res, message)
  } catch (error: any) {
    log(error.message);
    apiRes.errorResponse(res, ERROR.SomethingWrong);
    return;
  }
};

export const deleteStreamer = async (req: AuthenticateRequest, res: Response, next: NextFunction) => {
  try {
    const db = getDB();
    if (!req.body.id) {
      apiRes.errorResponse(res, "Streamer id required.")
      return
    }

    const streamer = await db('streamers').where('id', parseInt(req.body.id)).first();
    if (!streamer) {
      apiRes.errorResponse(res, "Streamer not found.")
      return
    }

    await db('users')
      .where('id', streamer.user_id)
      .update({ status: 2, updated_at: new Date() });

    await db('streamers')
      .where('id', parseInt(req.body.id))
      .update({ updated_at: new Date() });

    apiRes.successResponse(res, MODEL.modelDeleted)
  } catch (error: any) {
    log(error.message);
    apiRes.errorResponse(res, ERROR.SomethingWrong);
    return;
  }
};

export const verifyStreamer = async (req: AuthenticateRequest, res: Response, next: NextFunction) => {
  try {
    const db = getDB();
    const { id, isVerified } = req.body;
    if (!id) {
      apiRes.errorResponse(res, "Streamer id required.")
      return
    }

    const streamer = await db('streamers').where('id', parseInt(id)).first();
    if (streamer) {
      await db('streamers')
        .where('id', parseInt(id))
        .update({ updated_at: new Date() });
    }

    apiRes.successResponse(res, MODEL.modelupdated)
  } catch (error: any) {
    log(error.message);
    apiRes.errorResponse(res, ERROR.SomethingWrong);
    return;
  }
};

export const updateStreamer = async (req: AuthenticateRequest, res: Response, next: NextFunction) => {
  const db = getDB();
  const trx = await db.transaction();

  try {
    const {
      id,
      status,
      age,
      attractiveBodyPart,
      height,
      weight,
      nationality,
      languages,
      special,
      specialties,
      cam2cam_special_service
    } = req.body;

    const image = req.file?.path;

    if (!id) {
      if (req.file) await deleteMulterFile(req.file);
      apiRes.errorResponse(res, "Streamer id required.");
      return;
    }

    const streamer = await trx('streamers').where('id', parseInt(id)).first();
    if (!streamer) {
      if (req.file) await deleteMulterFile(req.file);
      apiRes.errorResponse(res, "Streamer not found.");
      await trx.rollback();
      return;
    }

    let existingUser = null;

    const now = new Date();

    const userUpdate: any = { updated_at: now };
    if (status !== undefined) userUpdate.status = status;
    if (languages) userUpdate.language = languages;
    if (image) userUpdate.avatar = image;

    if (Object.keys(userUpdate).length > 1) {
      await trx('users').where('id', streamer.user_id).update(userUpdate);
    }

    const streamerUpdate: any = { updated_at: now };
    if (image) streamerUpdate.thumbnail = image;
    if (age !== undefined) streamerUpdate.age = age;
    if (attractiveBodyPart) streamerUpdate.attractive_body_part = attractiveBodyPart;
    if (height !== undefined) streamerUpdate.height = height;
    if (weight !== undefined) streamerUpdate.weight = weight;
    if (nationality) streamerUpdate.nationality = nationality;
    if (special) streamerUpdate.specialties = special;
    if (specialties) streamerUpdate.specialties = specialties;
    if (cam2cam_special_service) streamerUpdate.cam2cam_special_service = cam2cam_special_service;

    if (Object.keys(streamerUpdate).length > 1) {
      await trx('streamers').where('id', parseInt(id)).update(streamerUpdate);
    }

    await trx.commit();

    const updatedStreamer = await db('streamers')
      .join('users', 'streamers.user_id', 'users.id')
      .leftJoin('cam2cam_pricing', 'streamers.id', 'cam2cam_pricing.streamer_id')
      .where('streamers.id', parseInt(id))
      .select(
        'streamers.*',
        'users.nickname',
        'users.email_address',
        'users.avatar',
        'users.status'
      )
      .first();

    apiRes.successResponseWithData(res, "Streamer profile updated successfully", updatedStreamer);
  } catch (error: any) {
    log(error.message)
    await trx.rollback();
    if (req.file) await deleteMulterFile(req.file);
    apiRes.errorResponse(res, ERROR.SomethingWrong);
    return;
  }
};

export const updateStreamerPassword = async (req: AuthenticateRequest, res: Response, next: NextFunction) => {
  try {
    const db = getDB();
    if (!req.body.id) {
      apiRes.errorResponse(res, "Streamer id required.")
      return
    }

    const newPassword = req.body.newPassword;
    const confirmPassword = req.body.confirmPassword;

    if (newPassword !== confirmPassword) {
      apiRes.errorResponse(res, "Password and confirm password do not match.")
      return
    }

    const hashPassword = await PasswordService.hashPassword(newPassword);

    await db('users')
      .where('id', req.body.id)
      .update({ password_hash: hashPassword, password_updated_at: db.fn.now(), updated_at: db.fn.now() });

    apiRes.successResponse(res, "Streamer password updated successfully")
  } catch (error: any) {
    log(error.message);
    apiRes.errorResponse(res, ERROR.SomethingWrong);
    return;
  }
};