import { NextFunction, Request, Response } from 'express';
import { getDB } from '../../../config/db.config';
import * as apiRes from '../../../utils/apiResponse';
import { ERROR, SUCCESS } from '../../../utils/responseMssg';
import { log } from '../../../utils/logger';

interface AuthenticatedRequest extends Request {
    user?: any;
}

export const getAllPyramidRooms = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const db = getDB();

        // Get all 10 pyramid rooms ordered by room_position
        const rooms = await db('pyramid_rooms')
            .leftJoin('streamers', 'pyramid_rooms.current_streamer_id', 'streamers.id')
            .leftJoin('users', 'streamers.user_id', 'users.id')
            .where('pyramid_rooms.room_status', '!=', 2)
            .select(
                'pyramid_rooms.id',
                'pyramid_rooms.room_position',
                'pyramid_rooms.room_status',
                'pyramid_rooms.is_pinned',
                'pyramid_rooms.billing_rate_per_minute',
                'pyramid_rooms.entry_timestamp',
                'pyramid_rooms.current_streamer_id',
                'users.nickname',
                'streamers.id as streamer_id'
            )
            .orderBy('pyramid_rooms.room_position', 'asc');

        // Format the response
        const formattedRooms = rooms.map((room: any) => ({
            id: room.id,
            roomPosition: room.room_position,
            roomStatus: room.room_status === 1 ? 'Active' : 'Inactive',
            nickname: room.nickname || null,
            pinned: room.is_pinned ? 'YES' : 'NO',
            createdAt: room.entry_timestamp || null,
            feeRate: parseFloat(room.billing_rate_per_minute),
            currentStreamerId: room.current_streamer_id || null,
        }));

        apiRes.successResponseWithData(res, SUCCESS.dataFound, { rooms: formattedRooms, total: formattedRooms.length });
    } catch (error: any) {
        log(error.message);
        apiRes.errorResponse(res, ERROR.SomethingWrong);
        return;
    }
};

export const updatePyramidRoom = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const db = getDB();
    const trx = await db.transaction();

    try {
        const { roomId, billingRatePerMinute, isPinned } = req.body;

        if (!roomId) {
            await trx.rollback();
            apiRes.errorResponse(res, 'Room ID is required.');
            return;
        }

        // Check if room exists
        const room = await trx('pyramid_rooms')
            .where('id', parseInt(roomId))
            .where('room_status', '!=', 2)
            .first();

        if (!room) {
            await trx.rollback();
            apiRes.errorResponse(res, 'Room not found.');
            return;
        }

        const updateData: any = {
            updated_at: db.fn.now(),
        };

        // Update billing rate if provided
        if (billingRatePerMinute !== undefined) {
            updateData.billing_rate_per_minute = parseFloat(billingRatePerMinute);
        }

        // Handle pin/unpin logic
        if (isPinned !== undefined) {
            if (isPinned === true) {
                // Unpin all other rooms first
                await trx('pyramid_rooms')
                    .where('id', '!=', parseInt(roomId))
                    .where('room_status', '!=', 2)
                    .update({
                        is_pinned: false,
                        updated_at: db.fn.now(),
                    });
            }
            updateData.is_pinned = isPinned;
        }

        // Update the room
        await trx('pyramid_rooms')
            .where('id', parseInt(roomId))
            .update(updateData);

        await trx.commit();

        // Fetch updated room with streamer info
        const updatedRoom = await db('pyramid_rooms')
            .leftJoin('streamers', 'pyramid_rooms.current_streamer_id', 'streamers.id')
            .leftJoin('users', 'streamers.user_id', 'users.id')
            .where('pyramid_rooms.id', parseInt(roomId))
            .select(
                'pyramid_rooms.id',
                'pyramid_rooms.room_position',
                'pyramid_rooms.room_status',
                'pyramid_rooms.is_pinned',
                'pyramid_rooms.billing_rate_per_minute',
                'pyramid_rooms.entry_timestamp',
                'pyramid_rooms.current_streamer_id',
                'users.nickname',
                'streamers.id as streamer_id'
            )
            .first();

        const formattedRoom = {
            id: updatedRoom.id,
            roomPosition: updatedRoom.room_position,
            roomStatus: updatedRoom.room_status === 1 ? 'Active' : 'Inactive',
            nickname: updatedRoom.nickname || null,
            pinned: updatedRoom.is_pinned ? 'YES' : 'NO',
            createdAt: updatedRoom.entry_timestamp || null,
            feeRate: parseFloat(updatedRoom.billing_rate_per_minute),
            currentStreamerId: updatedRoom.current_streamer_id || null,
        };

        apiRes.successResponseWithData(res, 'Room updated successfully', formattedRoom);
    } catch (error: any) {
        log(error.message);
        await trx.rollback();
        apiRes.errorResponse(res, ERROR.SomethingWrong);
        return;
    }
};