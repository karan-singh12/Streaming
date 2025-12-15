import { NextFunction, Request, Response } from 'express';
import { getDB } from '../../../config/db.config';
import * as apiRes from '../../../utils/apiResponse';
import { ERROR, SUCCESS } from '../../../utils/responseMssg';
import { log } from '../../../utils/logger';

interface AuthenticatedRequest extends Request {
    user?: any;
}

export const getAllCam2CamRooms = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const db = getDB();
        const { pageSize, pageNumber, searchItem } = req.body;
        const offset = (pageNumber - 1) * pageSize;

        // Build query
        let query = db('streamers')
            .join('users', 'streamers.user_id', 'users.id')
            .leftJoin('cam2cam_pricing', 'streamers.id', 'cam2cam_pricing.streamer_id')
            .where('users.role', 'streamer')
            .where('users.status', '!=', 2);

        // Apply search filter if provided
        if (searchItem && searchItem.trim() !== '') {
            query = query.where(function () {
                this.where('streamers.unique_id', 'ilike', `%${searchItem}%`)
                    .orWhere('users.nickname', 'ilike', `%${searchItem}%`)
                    .orWhere('users.email_address', 'ilike', `%${searchItem}%`);
            });
        }

        // Get total count
        const totalRecords = await query.clone().count('* as count').first();
        const total = totalRecords ? Number(totalRecords.count) : 0;

        // Get paginated results
        const result = await query
            .select(
                'streamers.id',
                'streamers.unique_id as uniqueId',
                'users.email_address as emailAddress',
                'users.nickname',
                'cam2cam_pricing.duration_15_min as duration15Min',
                'cam2cam_pricing.duration_30_min as duration30Min',
                'cam2cam_pricing.duration_45_min as duration45Min',
                'cam2cam_pricing.duration_60_min as duration60Min'
            )
            .orderBy('streamers.created_at', 'desc')
            .limit(pageSize)
            .offset(offset);

        // Format the response - convert null pricing to defaults if not set
        const formattedResult = result.map((item: any) => ({
            id: item.id,
            uniqueId: item.uniqueId,
            emailAddress: item.emailAddress,
            nickname: item.nickname,
            duration15Min: item.duration15Min ? parseFloat(item.duration15Min) : 30, // Default
            duration30Min: item.duration30Min ? parseFloat(item.duration30Min) : 55, // Default
            duration45Min: item.duration45Min ? parseFloat(item.duration45Min) : 75, // Default
            duration60Min: item.duration60Min ? parseFloat(item.duration60Min) : 95, // Default
        }));

        apiRes.successResponseWithData(res, SUCCESS.dataFound, {
            result: formattedResult,
            totalRecords: total,
            pageNumber,
            pageSize,
        });
    } catch (error: any) {
        log(error.message);
        apiRes.errorResponse(res, ERROR.SomethingWrong);
        return;
    }
};

export const updateCam2CamPricing = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const db = getDB();
    const trx = await db.transaction();

    try {
        const { streamerId, duration15Min, duration30Min, duration45Min, duration60Min } = req.body;

        if (!streamerId) {
            await trx.rollback();
            apiRes.errorResponse(res, 'Streamer ID is required.');
            return;
        }

        // Check if streamer exists
        const streamer = await trx('streamers')
            .join('users', 'streamers.user_id', 'users.id')
            .where('streamers.id', parseInt(streamerId))
            .where('users.status', '!=', 2)
            .first();

        if (!streamer) {
            await trx.rollback();
            apiRes.errorResponse(res, 'Streamer not found.');
            return;
        }

        // Check if pricing exists
        const existingPricing = await trx('cam2cam_pricing')
            .where('streamer_id', parseInt(streamerId))
            .first();

        const now = new Date();

        if (existingPricing) {
            // Update existing pricing
            const updateData: any = {
                updated_at: now,
            };

            if (duration15Min !== undefined) updateData.duration_15_min = parseFloat(duration15Min);
            if (duration30Min !== undefined) updateData.duration_30_min = parseFloat(duration30Min);
            if (duration45Min !== undefined) updateData.duration_45_min = parseFloat(duration45Min);
            if (duration60Min !== undefined) updateData.duration_60_min = parseFloat(duration60Min);

            await trx('cam2cam_pricing')
                .where('streamer_id', parseInt(streamerId))
                .update(updateData);
        } else {
            // Create new pricing record with defaults or provided values
            await trx('cam2cam_pricing').insert({
                streamer_id: parseInt(streamerId),
                duration_15_min: duration15Min !== undefined ? parseFloat(duration15Min) : 30,
                duration_30_min: duration30Min !== undefined ? parseFloat(duration30Min) : 55,
                duration_45_min: duration45Min !== undefined ? parseFloat(duration45Min) : 75,
                duration_60_min: duration60Min !== undefined ? parseFloat(duration60Min) : 95,
                created_at: now,
                updated_at: now,
            });
        }

        await trx.commit();

        // Fetch updated pricing with streamer info
        const updatedPricing = await db('streamers')
            .join('users', 'streamers.user_id', 'users.id')
            .leftJoin('cam2cam_pricing', 'streamers.id', 'cam2cam_pricing.streamer_id')
            .where('streamers.id', parseInt(streamerId))
            .select(
                'streamers.id',
                'streamers.unique_id as uniqueId',
                'users.email_address as emailAddress',
                'users.nickname',
                'cam2cam_pricing.duration_15_min as duration15Min',
                'cam2cam_pricing.duration_30_min as duration30Min',
                'cam2cam_pricing.duration_45_min as duration45Min',
                'cam2cam_pricing.duration_60_min as duration60Min'
            )
            .first();

        const formattedResult = {
            id: updatedPricing.id,
            uniqueId: updatedPricing.uniqueId,
            emailAddress: updatedPricing.emailAddress,
            nickname: updatedPricing.nickname,
            duration15Min: updatedPricing.duration15Min ? parseFloat(updatedPricing.duration15Min) : 30,
            duration30Min: updatedPricing.duration30Min ? parseFloat(updatedPricing.duration30Min) : 55,
            duration45Min: updatedPricing.duration45Min ? parseFloat(updatedPricing.duration45Min) : 75,
            duration60Min: updatedPricing.duration60Min ? parseFloat(updatedPricing.duration60Min) : 95,
        };

        apiRes.successResponseWithData(res, 'Cam2Cam pricing updated successfully', formattedResult);
    } catch (error: any) {
        log(error.message);
        await trx.rollback();
        apiRes.errorResponse(res, ERROR.SomethingWrong);
        return;
    }
};