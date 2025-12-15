import { Request, Response, NextFunction } from "express";
import { USER, SUCCESS, ERROR } from "../../../utils/responseMssg";
import * as apiRes from "../../../utils/apiResponse";
import { log } from "../../../utils/logger";
import { generateWowzaPublisherToken } from '../../../services/streaming/wowza.service';
import { getDB } from "../../../config/db.config";
// import { AuthenticatedRequest } from '../../types/auth.types';

interface AuthenticatedRequest extends Request {
    user?: any;
}

export const startStream = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
        const db = getDB();
        const userId = req.user?.id || req.user?._id;
        const { streamerName, type, billingRatePerMin = 0.1 } = req.body;

        if (!req.user) {
            apiRes.errorResponse(res, USER.accountNotExists);
            return;
        }

        if (!streamerName) {
            apiRes.errorResponse(res, 'Stream name is required');
            return;
        }

        // Get streamer profile for this user
        const streamer = await db('streamers')
            .where('user_id', parseInt(userId))
            .first();

        if (!streamer) {
            apiRes.errorResponse(res, 'Streamer profile not found');
            return;
        }

        // Check if streamer already has an active stream in a pyramid room
        const existingPyramidRoom = await db('pyramid_rooms')
            .where('current_streamer_id', streamer.id)
            .where('room_status', 1)
            .first();

        if (existingPyramidRoom) {
            apiRes.errorResponse(res, 'You already have an active stream in a pyramid room');
            return;
        }

        let roomId = null;
        if (type === 'public') {
            const totalRooms = await db('pyramid_rooms')
                .where('room_status', '!=', 2)
                .count('* as count')
                .first();

            const roomCount = totalRooms ? Number(totalRooms.count) : 0;
            const MAX_PYRAMID_ROOMS = 10;

            if (roomCount < MAX_PYRAMID_ROOMS) {
                const maxPosition = await db('pyramid_rooms')
                    .where('room_status', '!=', 2)
                    .max('room_position as maxPos')
                    .first();

                const nextPosition = maxPosition && maxPosition.maxPos ? Number(maxPosition.maxPos) + 1 : 1;

                const [newRoom] = await db('pyramid_rooms')
                    .insert({
                        room_position: nextPosition,
                        current_streamer_id: streamer.id,
                        room_status: 1,
                        billing_rate_per_minute: billingRatePerMin || 0.1,
                        entry_timestamp: db.fn.now(),
                        created_at: db.fn.now(),
                        updated_at: db.fn.now()
                    })
                    .returning('*');

                roomId = newRoom.id;
            } else {
                const availableRoom = await db('pyramid_rooms')
                    .where('room_status', '!=', 2)
                    .whereNull('current_streamer_id')
                    .orderBy('room_position', 'asc')
                    .first();

                if (!availableRoom) {
                    apiRes.errorResponse(res, 'No available pyramid rooms. All rooms are currently occupied.');
                    return;
                }

                await db('pyramid_rooms')
                    .where('id', availableRoom.id)
                    .update({
                        current_streamer_id: streamer.id,
                        room_status: 1,
                        entry_timestamp: db.fn.now(),
                        updated_at: db.fn.now()
                    });

                roomId = availableRoom.id;
            }
        } else if (type === 'cam2cam') {

        }

        await db('streamers')
            .where('id', streamer.id)
            .update({
                is_online: true,
                current_room_type: type,
                updated_at: db.fn.now()
            });

        let finalBillingRate = billingRatePerMin || 0.1;
        if (roomId && type === 'pyramid') {
            const pyramidRoom = await db('pyramid_rooms')
                .where('id', roomId)
                .first();
            if (pyramidRoom) {
                finalBillingRate = Number(pyramidRoom.billing_rate_per_minute);
            }
        }

        const publisherData = await generateWowzaPublisherToken(streamerName);

        apiRes.successResponseWithData(res, SUCCESS.StreamCreated || 'Stream created successfully', {
            roomId: roomId || streamer.id,
            streamKey: streamerName,
            publisherData,
            type: type,
            billingRatePerMin: finalBillingRate,
            status: 'ready_to_stream'
        });
    } catch (error: any) {
        log(error.message);
        apiRes.errorResponse(res, ERROR.SomethingWrong);
        return;
    }
};

export const endSession = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
        const db = getDB();
        const { sessionId } = req.body;
        const userId = req.user?.id || req.user?._id;

        const session = await db('room_sessions')
            .where('id', parseInt(sessionId))
            .first();

        if (!session) {
            apiRes.errorResponse(res, 'Session not found');
            return;
        }

        if (session.viewer_id !== parseInt(userId) && session.streamer_id !== parseInt(userId)) {
            apiRes.errorResponse(res, 'Unauthorized');
            return;
        }

        if (session.session_end) {
            apiRes.errorResponse(res, 'Session already ended');
            return;
        }

        const endTime = new Date();
        const startTime = new Date(session.session_start);
        const durationMinutes = Math.ceil((endTime.getTime() - startTime.getTime()) / (1000 * 60));

        let creditsToDeduct = 0;
        if (session.room_type === 'pyramid' && session.pyramid_room_id) {
            const pyramidRoom = await db('pyramid_rooms')
                .where('id', session.pyramid_room_id)
                .first();
            if (pyramidRoom) {
                creditsToDeduct = durationMinutes * Number(pyramidRoom.billing_rate_per_minute);
            }
        } else if (session.room_type === 'cam2cam') {
            const cam2camSession = await db('cam2cam_sessions')
                .where('room_session_id', session.id)
                .first();
            if (cam2camSession) {
                creditsToDeduct = Number(cam2camSession.package_price);

                await db('cam2cam_sessions')
                    .where('id', cam2camSession.id)
                    .update({
                        connection_end: endTime,
                        actual_duration_minutes: durationMinutes,
                        viewer_disconnected: session.viewer_id === parseInt(userId),
                        streamer_disconnected: session.streamer_id === parseInt(userId),
                        updated_at: db.fn.now()
                    });
            }
        }

        await db('room_sessions')
            .where('id', parseInt(sessionId))
            .update({
                session_end: endTime,
                duration_minutes: durationMinutes,
                credits_earned: creditsToDeduct,
                disconnection_type: 'normal'
            });

        apiRes.successResponseWithData(res, 'Session ended', {
            durationMinutes,
            creditsUsed: creditsToDeduct,
            totalSessionCredits: creditsToDeduct
        });

    } catch (error: any) {
        log(error.message);
        apiRes.errorResponse(res, ERROR.SomethingWrong);
        return;
    }
};

export const endStream = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
        const db = getDB();
        const userId = req.user?.id || req.user?._id;
        const { type, roomId } = req.body;

        // Get streamer for this user
        const streamer = await db('streamers')
            .where('user_id', parseInt(userId))
            .first();

        if (!streamer) {
            apiRes.errorResponse(res, 'Streamer profile not found');
            return;
        }

        // Find pyramid room - either by roomId or by streamer ID
        let pyramidRoom = null;
        if (roomId) {
            pyramidRoom = await db('pyramid_rooms')
                .where('id', parseInt(roomId))
                .where('current_streamer_id', streamer.id)
                .first();
        } else {
            // If roomId not provided, find by streamer ID
            pyramidRoom = await db('pyramid_rooms')
                .where('current_streamer_id', streamer.id)
                .where('room_status', 1) // 1 = active
                .first();
        }

        let activeSessions: any[] = [];
        let totalEarnings = 0;
        const endTime = new Date();

        if (type === 'public') {
            // End all active sessions for this pyramid room
            // activeSessions = await db('room_sessions')
            //     .where('pyramid_room_id', pyramidRoom.id)
            //     .where('streamer_id', streamer.id)
            //     .whereNull('session_end');

            // for (const session of activeSessions) {
            //     const startTime = new Date(session.session_start);
            //     const durationMinutes = Math.ceil((endTime.getTime() - startTime.getTime()) / (1000 * 60));
            //     const creditsEarned = durationMinutes * Number(pyramidRoom.billing_rate_per_minute);

            //     await db('room_sessions')
            //         .where('id', session.id)
            //         .update({
            //             session_end: endTime,
            //             duration_minutes: durationMinutes,
            //             credits_earned: creditsEarned,
            //             disconnection_type: 'normal'
            //         });

            //     totalEarnings += creditsEarned;
            // }

            // Clear pyramid room - remove streamer ID and set status to 0 (inactive)
            await db('pyramid_rooms')
                .where('id', pyramidRoom.id)
                .update({
                    current_streamer_id: null, // Remove streamer ID
                    room_status: 0, // 0 = inactive
                    entry_timestamp: null,
                    updated_at: db.fn.now()
                });
        } else {
            // For cam2cam, end all active sessions for this streamer
            activeSessions = await db('room_sessions')
                .where('streamer_id', streamer.id)
                .where('room_type', 'cam2cam')
                .whereNull('session_end');

            for (const session of activeSessions) {
                const cam2camSession = await db('cam2cam_sessions')
                    .where('room_session_id', session.id)
                    .first();

                if (cam2camSession) {
                    const creditsEarned = Number(cam2camSession.package_price);

                    await db('room_sessions')
                        .where('id', session.id)
                        .update({
                            session_end: endTime,
                            disconnection_type: 'normal'
                        });

                    await db('cam2cam_sessions')
                        .where('id', cam2camSession.id)
                        .update({
                            connection_end: endTime,
                            streamer_disconnected: true
                        });

                    totalEarnings += creditsEarned;
                }
            }
        }

        // Update streamer status
        await db('streamers')
            .where('id', streamer.id)
            .update({
                is_online: false,
                current_room_type: null,
                updated_at: db.fn.now()
            });

        apiRes.successResponseWithData(res, 'Stream ended successfully', {
            totalSessions: activeSessions.length,
            totalEarnings: totalEarnings * 0.7
        });

    } catch (error: any) {
        log(error.message);
        apiRes.errorResponse(res, ERROR.SomethingWrong);
        return;
    }
};

export const reconnectStream = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
        const db = getDB();
        const userId = req.user?.id || req.user?._id;
        const { streamerName } = req.body;

        if (!req.user) {
            apiRes.errorResponse(res, USER.accountNotExists);
            return;
        }

        if (!streamerName) {
            apiRes.errorResponse(res, 'Stream name is required');
            return;
        }

        // Get streamer profile for this user
        const streamer = await db('streamers')
            .where('user_id', parseInt(userId))
            .first();

        if (!streamer) {
            apiRes.errorResponse(res, 'Streamer profile not found');
            return;
        }

        // Find active pyramid room for this streamer
        const pyramidRoom = await db('pyramid_rooms')
            .where('current_streamer_id', streamer.id)
            .where('room_status', 1) // 1 = active
            .first();

        if (!pyramidRoom) {
            apiRes.errorResponse(res, 'No active stream found. Please start a new stream.');
            return;
        }

        // Verify the room still belongs to this streamer
        if (pyramidRoom.current_streamer_id !== streamer.id) {
            apiRes.errorResponse(res, 'Stream room is no longer assigned to you');
            return;
        }

        // Update streamer status to online (in case it was marked offline due to disconnection)
        await db('streamers')
            .where('id', streamer.id)
            .update({
                is_online: true,
                updated_at: db.fn.now()
            });

        // Update pyramid room entry timestamp (to track reconnection)
        await db('pyramid_rooms')
            .where('id', pyramidRoom.id)
            .update({
                entry_timestamp: db.fn.now(),
                updated_at: db.fn.now()
            });

        // Generate new publisher token for reconnection
        const publisherData = await generateWowzaPublisherToken(streamerName);

        // Get billing rate
        const billingRate = Number(pyramidRoom.billing_rate_per_minute);

        apiRes.successResponseWithData(res, 'Stream reconnected successfully', {
            roomId: pyramidRoom.id,
            room_position: pyramidRoom.room_position,
            streamKey: streamerName,
            publisherData,
            type: 'public',
            billingRatePerMin: billingRate,
            status: 'reconnected',
            entry_timestamp: pyramidRoom.entry_timestamp
        });

    } catch (error: any) {
        log(error.message);

        apiRes.errorResponse(res, ERROR.SomethingWrong);

        return;
    }
};