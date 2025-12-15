import { Request, Response, NextFunction } from "express";
import { USER, SUCCESS, ERROR } from "../../../utils/responseMssg";
import * as apiRes from "../../../utils/apiResponse";
import { log } from "../../../utils/logger";
import { getDB } from "../../../config/db.config";
// import { AuthenticatedRequest } from '../../types/auth.types';

interface AuthenticatedRequest extends Request {
    user?: any;
}

export const joinStream = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
        const db = getDB();
        const { roomId, packageType = 'pyramid_minute' } = req.body;
        const viewerId = req.user?.id || req.user?._id;

        if (!roomId || !viewerId) {
            apiRes.errorResponse(res, 'Missing required fields');
            return;
        }

        // Determine room type and get streamer info
        let streamerId: number;
        let roomType: string;
        let billingRate: number;

        // Check if it's a pyramid room
        const pyramidRoom = await db('pyramid_rooms')
            .where('id', parseInt(roomId))
            .first();

        if (pyramidRoom && pyramidRoom.current_streamer_id) {
            roomType = 'pyramid';
            streamerId = pyramidRoom.current_streamer_id;
            billingRate = Number(pyramidRoom.billing_rate_per_minute);

            if (pyramidRoom.room_status !== 1) {
                apiRes.errorResponse(res, 'Room is not active');
                return;
            }
        } else {
            const streamer = await db('streamers')
                .where('id', parseInt(roomId))
                .where('is_online', true)
                .first();

            if (!streamer) {
                apiRes.errorResponse(res, 'Stream not found or not live');
                return;
            }

            roomType = 'cam2cam';
            streamerId = streamer.id;
            billingRate = 0;

            const pricing = await db('cam2cam_pricing')
                .where('streamer_id', streamer.id)
                .first();

            if (pricing) {
                if (packageType.includes('15')) billingRate = Number(pricing.duration_15_min);
                else if (packageType.includes('30')) billingRate = Number(pricing.duration_30_min);
                else if (packageType.includes('45')) billingRate = Number(pricing.duration_45_min);
                else if (packageType.includes('60')) billingRate = Number(pricing.duration_60_min);
            }
        }

        const streamer = await db('streamers').where('id', streamerId).first();
        if (streamer && streamer.user_id === parseInt(viewerId)) {
            apiRes.errorResponse(res, 'Cannot join your own stream');
            return;
        }

        const existingSession = await db('room_sessions')
            .where('viewer_id', parseInt(viewerId))
            .where('streamer_id', streamerId)
            .whereNull('session_end')
            .first();

        if (existingSession) {
            apiRes.successResponseWithData(res, 'Already in session', {
                sessionId: existingSession.id,
                status: 'active',
                queuePosition: 0
            });
            return;
        }

        let canJoin = true;
        if (roomType === 'cam2cam') {
            const activeCam2camSession = await db('cam2cam_sessions')
                .join('room_sessions', 'cam2cam_sessions.room_session_id', 'room_sessions.id')
                .where('room_sessions.streamer_id', streamerId)
                .whereNull('room_sessions.session_end')
                .where('cam2cam_sessions.connection_initiated', true)
                .whereNull('cam2cam_sessions.connection_end')
                .first();

            if (activeCam2camSession) {
                apiRes.errorResponse(res, 'Streamer is currently in a private session');
                return;
            }
        }

        const [roomSession] = await db('room_sessions')
            .insert({
                room_type: roomType,
                pyramid_room_id: roomType === 'pyramid' ? parseInt(roomId) : null,
                streamer_id: streamerId,
                viewer_id: parseInt(viewerId),
                session_start: db.fn.now(),
                credits_earned: 0,
                created_at: db.fn.now()
            })
            .returning('*');

        // For cam2cam, create cam2cam session
        let cam2camSession = null;
        if (roomType === 'cam2cam') {
            const packageDuration = packageType.includes('15') ? 15 :
                packageType.includes('30') ? 30 :
                    packageType.includes('45') ? 45 : 60;

            [cam2camSession] = await db('cam2cam_sessions')
                .insert({
                    room_session_id: roomSession.id,
                    viewer_id: parseInt(viewerId),
                    streamer_id: streamerId,
                    package_duration_minutes: packageDuration,
                    package_price: billingRate,
                    connection_initiated: false,
                    created_at: db.fn.now()
                })
                .returning('*');
        }

        apiRes.successResponseWithData(res, 'Joined stream successfully', {
            sessionId: roomSession.id,
            startTime: roomSession.session_start,
            packageType: packageType,
            status: 'active',
            queuePosition: 0,
            roomType: roomType,
            billingRate: billingRate,
            cam2camSessionId: cam2camSession?.id || null
        });

    } catch (error: any) {
        log(error.message);
        apiRes.errorResponse(res, ERROR.SomethingWrong);
        return;
    }
};

export const pyramidRooms = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
        const db = getDB();

        // Get all pyramid rooms with status 1 (active) and join with streamer and user data
        const pyramidRoomsList = await db('pyramid_rooms')
            .where('room_status', 1) // 1 = active
            .leftJoin('streamers', 'pyramid_rooms.current_streamer_id', 'streamers.id')
            .leftJoin('users', 'streamers.user_id', 'users.id')
            .select(
                'pyramid_rooms.id',
                'pyramid_rooms.room_position',
                'pyramid_rooms.current_streamer_id',
                'pyramid_rooms.room_status',
                'pyramid_rooms.is_pinned',
                'pyramid_rooms.billing_rate_per_minute',
                'pyramid_rooms.entry_timestamp',
                'pyramid_rooms.created_at',
                'pyramid_rooms.updated_at',
                'streamers.id as streamer_id',
                'streamers.unique_id as streamer_unique_id',
                'streamers.thumbnail as streamer_thumbnail',
                'streamers.theme_description as theme_description',
                'streamers.is_online as streamer_is_online',
                'users.id as user_id',
                'users.email_address',
                'users.nickname',
                'users.avatar as user_avatar'
            )
            .orderBy('pyramid_rooms.room_position', 'asc');

        // Format the response data
        const formattedRooms = pyramidRoomsList.map((room: any) => ({
            id: room.id,
            room_position: room.room_position,
            room_status: room.room_status,
            is_pinned: room.is_pinned,
            billing_rate_per_minute: Number(room.billing_rate_per_minute),
            entry_timestamp: room.entry_timestamp,
            created_at: room.created_at,
            updated_at: room.updated_at,
            current_streamer: room.current_streamer_id ? {
                streamer_id: room.streamer_id,
                unique_id: room.streamer_unique_id,
                thumbnail: room.streamer_thumbnail,
                theme_description: room.theme_description,
                is_online: room.streamer_is_online,
                user_id: room.user_id,
                email_address: room.email_address,
                nickname: room.nickname,
                avatar: room.user_avatar
            } : null
        }));

        apiRes.successResponseWithData(res, SUCCESS.dataFound || 'Pyramid rooms retrieved successfully', {
            rooms: formattedRooms,
            total: formattedRooms.length
        });

    } catch (error: any) {
        log(error.message);
        apiRes.errorResponse(res, ERROR.SomethingWrong);
        return;
    }
};

export const getTopStreamersByTraffic = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
        const db = getDB();

        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

        const topStreamers = await db('room_sessions')
            .join('streamers', 'room_sessions.streamer_id', 'streamers.id')
            .join('users', 'streamers.user_id', 'users.id')
            .where('room_sessions.session_start', '>=', startOfMonth)
            .where('room_sessions.session_start', '<=', endOfMonth)
            .where('users.status', '!=', 2)
            .where('users.role', 'streamer')
            .select(
                'streamers.id',
                'streamers.unique_id',
                'streamers.thumbnail',
                'streamers.theme_description',
                'streamers.is_online',
                'users.nickname',
                'users.avatar',
                db.raw('COUNT(room_sessions.id) as monthly_traffic')
            )
            .groupBy(
                'streamers.id',
                'streamers.unique_id',
                'streamers.thumbnail',
                'streamers.theme_description',
                'streamers.is_online',
                'users.nickname',
                'users.avatar'
            )
            .orderBy('monthly_traffic', 'desc')
            .limit(10);

        const formattedStreamers = topStreamers.map((streamer: any) => ({
            id: streamer.id,
            uniqueId: streamer.unique_id,
            nickname: streamer.nickname,
            avatar: streamer.avatar,
            thumbnail: streamer.thumbnail,
            themeDescription: streamer.theme_description,
            isOnline: streamer.is_online,
            monthlyTraffic: parseInt(streamer.monthly_traffic) || 0,
        }));

        apiRes.successResponseWithData(res, SUCCESS.dataFound || 'Top streamers retrieved successfully', {
            streamers: formattedStreamers,
            total: formattedStreamers.length,
            month: now.toLocaleString('default', { month: 'long', year: 'numeric' })
        });

    } catch (error: any) {
        log(error.message);
        apiRes.errorResponse(res, ERROR.SomethingWrong);
        return;
    }
};