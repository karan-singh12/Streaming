// import Redis from 'ioredis';
// import { v4 as uuidv4 } from 'uuid';

// interface SessionData {
//   userId: string;
//   role: 'user' | 'admin' | 'guest';
//   email: string;
//   isOnline: boolean;
//   lastActivity: number;
//   roomId?: string;
//   streamQuality: '1080p' | '720p' | '480p';
//   deviceType: 'desktop' | 'mobile';
//   ipAddress: string;
//   userAgent: string;
// }

// interface StreamSession {
//   sessionId: string;
//   userId: string;
//   roomId: string;
//   streamType: 'host' | 'viewer' | 'preview';
//   quality: string;
//   startTime: number;
//   bandwidth: number;
// }

// class SessionService {
//   private redis: Redis;
//   private streamRedis: Redis;

//   constructor() {
//     // Main Redis instance for sessions
//     this.redis = new Redis({
//       host: process.env.REDIS_HOST || 'redis-cluster',
//       port: parseInt(process.env.REDIS_PORT || '6379'),
//       password: process.env.REDIS_PASSWORD || 'redis_secure_password_123',
//       retryDelayOnFailover: 100,
//       maxRetriesPerRequest: 3,
//       lazyConnect: true,
//       keepAlive: 30000,
//       connectTimeout: 10000,
//       commandTimeout: 5000,
//     });

//     // Separate Redis instance for stream sessions
//     this.streamRedis = new Redis({
//       host: process.env.REDIS_HOST || 'redis-cluster',
//       port: parseInt(process.env.REDIS_PORT || '6379'),
//       password: process.env.REDIS_PASSWORD || 'redis_secure_password_123',
//       db: 1, // Use different database for stream sessions
//       retryDelayOnFailover: 100,
//       maxRetriesPerRequest: 3,
//       lazyConnect: true,
//       keepAlive: 30000,
//       connectTimeout: 10000,
//       commandTimeout: 5000,
//     });

//     this.setupEventHandlers();
//   }

//   private setupEventHandlers(): void {
//     this.redis.on('error', (error) => {
//       console.error('Redis connection error:', error);
//     });

//     this.redis.on('connect', () => {
//       console.log('✅ Redis connected successfully');
//     });

//     this.streamRedis.on('error', (error) => {
//       console.error('Stream Redis connection error:', error);
//     });
//   }

//   // Session Management
//   async createSession(userData: Partial<SessionData>): Promise<string> {
//     const sessionId = uuidv4();
//     const sessionData: SessionData = {
//       userId: userData.userId || '',
//       role: userData.role || 'guest',
//       email: userData.email || '',
//       isOnline: true,
//       lastActivity: Date.now(),
//       streamQuality: userData.streamQuality || '1080p',
//       deviceType: userData.deviceType || 'desktop',
//       ipAddress: userData.ipAddress || '',
//       userAgent: userData.userAgent || '',
//       ...userData
//     };

//     // Store session with 24-hour expiration
//     await this.redis.setex(`session:${sessionId}`, 86400, JSON.stringify(sessionData));

//     // Add to online users set
//     await this.redis.sadd('online_users', sessionId);

//     // Update user's last activity
//     await this.redis.hset(`user:${sessionData.userId}`, {
//       lastActivity: Date.now(),
//       isOnline: 'true',
//       sessionId: sessionId
//     });

//     return sessionId;
//   }

//   async getSession(sessionId: string): Promise<SessionData | null> {
//     const sessionData = await this.redis.get(`session:${sessionId}`);
//     if (!sessionData) return null;

//     const parsed = JSON.parse(sessionData);

//     // Update last activity
//     parsed.lastActivity = Date.now();
//     await this.redis.setex(`session:${sessionId}`, 86400, JSON.stringify(parsed));

//     return parsed;
//   }

//   async updateSession(sessionId: string, updates: Partial<SessionData>): Promise<void> {
//     const session = await this.getSession(sessionId);
//     if (!session) return;

//     const updatedSession = { ...session, ...updates };
//     await this.redis.setex(`session:${sessionId}`, 86400, JSON.stringify(updatedSession));
//   }

//   async destroySession(sessionId: string): Promise<void> {
//     const session = await this.getSession(sessionId);
//     if (session) {
//       // Remove from online users
//       await this.redis.srem('online_users', sessionId);

//       // Update user status
//       await this.redis.hset(`user:${session.userId}`, {
//         isOnline: 'false',
//         lastActivity: Date.now()
//       });
//     }

//     // Delete session
//     await this.redis.del(`session:${sessionId}`);
//   }

//   // Stream Session Management
//   async createStreamSession(streamData: Omit<StreamSession, 'sessionId'>): Promise<string> {
//     const sessionId = uuidv4();
//     const streamSession: StreamSession = {
//       sessionId,
//       ...streamData
//     };

//     // Store stream session with 1-hour expiration
//     await this.streamRedis.setex(`stream:${sessionId}`, 3600, JSON.stringify(streamSession));

//     // Add to active streams set
//     await this.streamRedis.sadd('active_streams', sessionId);

//     // Track room streams
//     await this.streamRedis.sadd(`room:${streamData.roomId}:streams`, sessionId);

//     return sessionId;
//   }

//   async getStreamSession(sessionId: string): Promise<StreamSession | null> {
//     const streamData = await this.streamRedis.get(`stream:${sessionId}`);
//     if (!streamData) return null;
//     return JSON.parse(streamData);
//   }

//   async endStreamSession(sessionId: string): Promise<void> {
//     const streamSession = await this.getStreamSession(sessionId);
//     if (streamSession) {
//       // Remove from active streams
//       await this.streamRedis.srem('active_streams', sessionId);

//       // Remove from room streams
//       await this.streamRedis.srem(`room:${streamSession.roomId}:streams`, sessionId);
//     }

//     // Delete stream session
//     await this.streamRedis.del(`stream:${sessionId}`);
//   }

//   // Analytics and Monitoring
//   async getOnlineUsersCount(): Promise<number> {
//     return await this.redis.scard('online_users');
//   }

//   async getActiveStreastreamingount(): Promise<number> {
//     return await this.streamRedis.scard('active_streams');
//   }

//   async getRoomStreastreamingount(roomId: string): Promise<number> {
//     return await this.streamRedis.scard(`room:${roomId}:streams`);
//   }

//   async getBandwidthUsage(): Promise<number> {
//     const activeStreams = await this.streamRedis.smembers('active_streams');
//     let totalBandwidth = 0;

//     for (const sessionId of activeStreams) {
//       const streamSession = await this.getStreamSession(sessionId);
//       if (streamSession) {
//         totalBandwidth += streamSession.bandwidth;
//       }
//     }

//     return totalBandwidth;
//   }

//   // Cache Management
//   async cacheRoomData(roomId: string, data: any, ttl: number = 300): Promise<void> {
//     await this.redis.setex(`room:${roomId}:data`, ttl, JSON.stringify(data));
//   }

//   async getCachedRoomData(roomId: string): Promise<any | null> {
//     const data = await this.redis.get(`room:${roomId}:data`);
//     return data ? JSON.parse(data) : null;
//   }

//   async cacheUserData(userId: string, data: any, ttl: number = 600): Promise<void> {
//     await this.redis.setex(`user:${userId}:data`, ttl, JSON.stringify(data));
//   }

//   async getCachedUserData(userId: string): Promise<any | null> {
//     const data = await this.redis.get(`user:${userId}:data`);
//     return data ? JSON.parse(data) : null;
//   }

//   // Rate Limiting
//   async checkRateLimit(identifier: string, limit: number, window: number): Promise<boolean> {
//     const key = `rate_limit:${identifier}`;
//     const current = await this.redis.incr(key);

//     if (current === 1) {
//       await this.redis.expire(key, window);
//     }

//     return current <= limit;
//   }

//   // Cleanup expired sessions
//   async cleanupExpiredSessions(): Promise<void> {
//     const onlineUsers = await this.redis.smembers('online_users');

//     for (const sessionId of onlineUsers) {
//       const exists = await this.redis.exists(`session:${sessionId}`);
//       if (!exists) {
//         await this.redis.srem('online_users', sessionId);
//       }
//     }
//   }

//   // Health check
//   async healthCheck(): Promise<boolean> {
//     try {
//       await this.redis.ping();
//       await this.streamRedis.ping();
//       return true;
//     } catch (error) {
//       console.error('Redis health check failed:', error);
//       return false;
//     }
//   }

//   // Close connections
//   async close(): Promise<void> {
//     await this.redis.quit();
//     await this.streamRedis.quit();
//   }
// }

// export default new SessionService();
