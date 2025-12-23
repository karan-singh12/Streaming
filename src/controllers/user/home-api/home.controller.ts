import { Request, Response, NextFunction } from "express";
import { USER, SUCCESS, ERROR } from "../../../utils/responseMssg";
import * as apiRes from "../../../utils/apiResponse";
import { log } from "../../../utils/logger";
import { getDB } from "../../../config/db.config";
// import { AuthenticatedRequest } from '../../types/auth.types';

interface AuthenticatedRequest extends Request {
    user?: any;
}

// for join stream
export const joinStream = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
        const db = getDB();
        const { roomId, packageType = 'pyramid_minute' } = req.body;
        const viewerId = req.user?.id || req.user?._id;

        if (!roomId || !viewerId) {
            apiRes.errorResponse(res, 'Missing required fields');
            return;
        }

        let streamerId: number;
        let roomType: string;
        let billingRate: number;

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

// for get pyramid rooms
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
                'pyramid_rooms.metadata',
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
            metadata: room.metadata,
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

// for get cam2cam rooms
export const cam2camRooms = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
        const db = getDB();
        const { pageNumber = 1, pageSize = 10 } = req.body;
        const offset = (pageNumber - 1) * pageSize;

        const baseQuery = db('room_sessions')
            .where('room_sessions.room_status', 1)
            .where('room_sessions.room_type', 'cam2cam');

        // Get total count
        const totalResult = await baseQuery.clone().count('room_sessions.id as count').first();
        const totalRecords = totalResult ? Number(totalResult.count) : 0;

        const cam2camRoomsList = await baseQuery
            .join('streamers', 'room_sessions.streamer_id', 'streamers.id')
            .join('users', 'streamers.user_id', 'users.id')
            .leftJoin('cam2cam_sessions', 'room_sessions.id', 'cam2cam_sessions.room_session_id')
            .select(
                'room_sessions.id',
                'room_sessions.streamer_id',
                'room_sessions.room_status',
                'room_sessions.room_type',
                'room_sessions.session_start',
                'room_sessions.session_end',
                'room_sessions.created_at',
                'room_sessions.metadata',
                'streamers.id as streamer_profile_id',
                'streamers.unique_id as streamer_unique_id',
                'streamers.thumbnail as streamer_thumbnail',
                'streamers.theme_description as theme_description',
                'streamers.is_online as streamer_is_online',
                'users.id as user_id',
                'users.email_address',
                'users.nickname',
                'users.avatar as user_avatar',
                'cam2cam_sessions.id as cam2cam_session_id',
                'cam2cam_sessions.package_price',
                'cam2cam_sessions.package_duration_minutes',
                'cam2cam_sessions.connection_initiated',
                'cam2cam_sessions.viewer_id as cam2cam_viewer_id'
            )
            .orderBy('room_sessions.created_at', 'desc')
            .limit(pageSize)
            .offset(offset);

        const formattedRooms = cam2camRoomsList.map((room: any) => ({
            id: room.id,
            room_status: room.room_status,
            room_type: room.room_type,
            session_start: room.session_start,
            session_end: room.session_end,
            created_at: room.created_at,
            metadata: room.metadata,
            current_streamer: {
                streamer_id: room.streamer_profile_id,
                unique_id: room.streamer_unique_id,
                thumbnail: room.streamer_thumbnail,
                theme_description: room.theme_description,
                is_online: room.streamer_is_online,
                user_id: room.user_id,
                email_address: room.email_address,
                nickname: room.nickname,
                avatar: room.user_avatar
            },
            cam2cam_session: room.cam2cam_session_id ? {
                id: room.cam2cam_session_id,
                package_price: Number(room.package_price),
                package_duration_minutes: room.package_duration_minutes,
                connection_initiated: room.connection_initiated,
                viewer_id: room.cam2cam_viewer_id
            } : null
        }));

        apiRes.successResponseWithData(res, SUCCESS.dataFound || 'Cam2Cam rooms retrieved successfully', {
            rooms: formattedRooms,
            totalRecords,
            pageNumber,
            pageSize
        });

    } catch (error: any) {
        log(error.message);
        apiRes.errorResponse(res, ERROR.SomethingWrong);
        return;
    }
};

// for get pyramid room details by id
export const getPyramidRoomDetails = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
        const db = getDB();
        const { roomId } = req.params;

        if (!roomId) {
            apiRes.errorResponse(res, "Room ID is required");
            return;
        }

        const room = await db('pyramid_rooms')
            .where('pyramid_rooms.id', roomId)
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
                'pyramid_rooms.metadata',
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
            .first();

        if (!room) {
            apiRes.errorResponse(res, "Pyramid room not found");
            return;
        }

        const formattedRoom = {
            id: room.id,
            room_position: room.room_position,
            room_status: room.room_status,
            is_pinned: room.is_pinned,
            billing_rate_per_minute: Number(room.billing_rate_per_minute),
            entry_timestamp: room.entry_timestamp,
            created_at: room.created_at,
            updated_at: room.updated_at,
            metadata: room.metadata,
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
        };

        apiRes.successResponseWithData(res, SUCCESS.dataFound, formattedRoom);

    } catch (error: any) {
        log(error.message);
        apiRes.errorResponse(res, ERROR.SomethingWrong);
        return;
    }
};

// for get room session details by id (cam2cam)
export const getRoomSessionDetails = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
        const db = getDB();
        const { roomId } = req.params;

        if (!roomId) {
            apiRes.errorResponse(res, "Session ID is required");
            return;
        }

        const room = await db('room_sessions')
            .where('room_sessions.id', roomId)
            .join('streamers', 'room_sessions.streamer_id', 'streamers.id')
            .join('users', 'streamers.user_id', 'users.id')
            .leftJoin('cam2cam_sessions', 'room_sessions.id', 'cam2cam_sessions.room_session_id')
            .select(
                'room_sessions.id',
                'room_sessions.streamer_id',
                'room_sessions.room_status',
                'room_sessions.room_type',
                'room_sessions.session_start',
                'room_sessions.session_end',
                'room_sessions.created_at',
                'room_sessions.metadata',
                'streamers.id as streamer_profile_id',
                'streamers.unique_id as streamer_unique_id',
                'streamers.thumbnail as streamer_thumbnail',
                'streamers.theme_description as theme_description',
                'streamers.is_online as streamer_is_online',
                'users.id as user_id',
                'users.email_address',
                'users.nickname',
                'users.avatar as user_avatar',
                'cam2cam_sessions.id as cam2cam_session_id',
                'cam2cam_sessions.package_price',
                'cam2cam_sessions.package_duration_minutes',
                'cam2cam_sessions.connection_initiated',
                'cam2cam_sessions.viewer_id as cam2cam_viewer_id'
            )
            .first();

        if (!room) {
            apiRes.errorResponse(res, "Room session not found");
            return;
        }

        const formattedRoom = {
            id: room.id,
            room_status: room.room_status,
            room_type: room.room_type,
            session_start: room.session_start,
            session_end: room.session_end,
            created_at: room.created_at,
            metadata: room.metadata,
            current_streamer: {
                streamer_id: room.streamer_profile_id,
                unique_id: room.streamer_unique_id,
                thumbnail: room.streamer_thumbnail,
                theme_description: room.theme_description,
                is_online: room.streamer_is_online,
                user_id: room.user_id,
                email_address: room.email_address,
                nickname: room.nickname,
                avatar: room.user_avatar
            },
            cam2cam_session: room.cam2cam_session_id ? {
                id: room.cam2cam_session_id,
                package_price: Number(room.package_price),
                package_duration_minutes: room.package_duration_minutes,
                connection_initiated: room.connection_initiated,
                viewer_id: room.cam2cam_viewer_id
            } : null
        };

        apiRes.successResponseWithData(res, SUCCESS.dataFound, formattedRoom);

    } catch (error: any) {
        log(error.message);
        apiRes.errorResponse(res, ERROR.SomethingWrong);
        return;
    }
};

// for end stream
export const endStream = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
        const db = getDB();
        const userId = (req as any).user?.id || (req as any).user?._id;

        if (!userId) {
            return apiRes.errorResponse(res, "User not identified");
        }

        const stream = await db("room_sessions").where("user_id", userId).first();

        if (!stream) {
            return apiRes.errorResponse(res, "Stream not found");
        }

        await db("room_sessions").where("user_id", userId).update({
            session_end: new Date()
        });

        apiRes.successResponse(res, "Stream ended successfully");
    } catch (error: any) {
        log(error.message);
        apiRes.errorResponse(res, ERROR.SomethingWrong);
        return;
    }
};

// for get top streamers by traffic
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

// for follow streamer
export const followStreamer = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
        const db = getDB();
        const userId = (req as any).user?.id || (req as any).user?._id;
        const { streamerId } = req.body;

        if (!userId || !streamerId) {
            apiRes.errorResponse(res, USER.accountNotExists);
            return;
        }

        const follow = await db("follows").where("user_id", userId).where("streamer_id", streamerId).first();

        if (follow) {
            apiRes.errorResponse(res, USER.alreadyFollowed);
            return;
        }

        await db("follows").insert({
            user_id: userId,
            streamer_id: streamerId,
            created_at: new Date()
        });

        apiRes.successResponse(res, USER.followedSuccessfully);
    } catch (error: any) {
        log(error.message);
        apiRes.errorResponse(res, ERROR.SomethingWrong);
        return;
    }
};

// for unfollow streamer
export const unfollowStreamer = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
        const db = getDB();
        const userId = (req as any).user?.id || (req as any).user?._id;
        const { streamerId } = req.body;

        if (!userId || !streamerId) {
            apiRes.errorResponse(res, USER.accountNotExists);
            return;
        }

        const follow = await db("follows").where("user_id", userId).where("streamer_id", streamerId).first();

        if (!follow) {
            apiRes.errorResponse(res, USER.notFollowing);
            return;
        }

        await db("follows").where("user_id", userId).where("streamer_id", streamerId).del();

        apiRes.successResponse(res, USER.unfollowedSuccessfully);
    } catch (error: any) {
        log(error.message);
        apiRes.errorResponse(res, ERROR.SomethingWrong);
        return;
    }
};

// for get user follows
export const getUserFollows = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
        const db = getDB();
        const userId = (req as any).user?.id || (req as any).user?._id;

        if (!userId) {
            apiRes.errorResponse(res, USER.accountNotExists);
            return;
        }

        const follows = await db("follows").where("user_id", userId);

        apiRes.successResponseWithData(res, USER.followsRetrievedSuccessfully, follows);
    } catch (error: any) {
        log(error.message);
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

        apiRes.successResponse(res, SUCCESS.dataFound, membership);
    } catch (error: any) {
        console.error(error.message);
        apiRes.errorResponse(res, ERROR.SomethingWrong);
        return;
    }
};

// for get membership plans
export const getPlans = async (req: Request, res: Response) => {
    try {
        const db = getDB();
        const plans = await db("membership_plans")
            .where("is_active", true)
            .orderBy("display_order", "asc")
            .select("*");

        apiRes.successResponse(res, SUCCESS.dataFound, plans);
    } catch (error: any) {
        console.error(error.message);
        apiRes.errorResponse(res, ERROR.SomethingWrong)
        return;
    }
};