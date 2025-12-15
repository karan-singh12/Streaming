// import { register, Counter, Histogram, Gauge, collectDefaultMetrics } from 'prom-client';
// import SessionService from './session.service';

// // Enable default metrics collection
// collectDefaultMetrics({ register });

// class MetricsService {
//   // Application Metrics
//   private httpRequestsTotal = new Counter({
//     name: 'http_requests_total',
//     help: 'Total number of HTTP requests',
//     labelNames: ['method', 'route', 'status_code']
//   });

//   private httpRequestDuration = new Histogram({
//     name: 'http_request_duration_seconds',
//     help: 'Duration of HTTP requests in seconds',
//     labelNames: ['method', 'route', 'status_code'],
//     buckets: [0.1, 0.2, 0.5, 1, 2, 5, 10]
//   });

//   private activeConnections = new Gauge({
//     name: 'streaming_active_connections',
//     help: 'Number of active connections'
//   });

//   private concurrentUsers = new Gauge({
//     name: 'streaming_concurrent_users',
//     help: 'Number of concurrent users'
//   });

//   private activeStreams = new Gauge({
//     name: 'streaming_active_streams',
//     help: 'Number of active streams'
//   });

//   private totalBandwidth = new Gauge({
//     name: 'streaming_total_bandwidth',
//     help: 'Total bandwidth usage in bytes per second'
//   });

//   private cdnHitRate = new Gauge({
//     name: 'streaming_cdn_hit_rate',
//     help: 'CDN hit rate percentage'
//   });

//   private queueLength = new Gauge({
//     name: 'streaming_queue_length',
//     help: 'Current queue length'
//   });

//   private roomCount = new Gauge({
//     name: 'streaming_room_count',
//     help: 'Number of active rooms'
//   });

//   private streamQualityDistribution = new Gauge({
//     name: 'streaming_stream_quality_distribution',
//     help: 'Distribution of stream qualities',
//     labelNames: ['quality']
//   });

//   private userRoleDistribution = new Gauge({
//     name: 'streaming_user_role_distribution',
//     help: 'Distribution of user roles',
//     labelNames: ['role']
//   });

//   private deviceTypeDistribution = new Gauge({
//     name: 'streaming_device_type_distribution',
//     help: 'Distribution of device types',
//     labelNames: ['device_type']
//   });

//   private apiResponseTime = new Histogram({
//     name: 'streaming_api_response_time_seconds',
//     help: 'API response time in seconds',
//     labelNames: ['endpoint', 'method'],
//     buckets: [0.01, 0.05, 0.1, 0.2, 0.5, 1, 2, 5]
//   });

//   private databaseConnections = new Gauge({
//     name: 'streaming_database_connections',
//     help: 'Number of active database connections'
//   });

//   private redisConnections = new Gauge({
//     name: 'streaming_redis_connections',
//     help: 'Number of active Redis connections'
//   });

//   private cacheHitRate = new Gauge({
//     name: 'streaming_cache_hit_rate',
//     help: 'Cache hit rate percentage'
//   });

//   private errorRate = new Counter({
//     name: 'streaming_errors_total',
//     help: 'Total number of errors',
//     labelNames: ['error_type', 'component']
//   });

//   private streamStartTime = new Histogram({
//     name: 'streaming_stream_start_time_seconds',
//     help: 'Time to start a stream in seconds',
//     labelNames: ['stream_type', 'quality'],
//     buckets: [0.5, 1, 2, 5, 10, 30]
//   });

//   private streamDuration = new Histogram({
//     name: 'streaming_stream_duration_seconds',
//     help: 'Duration of streams in seconds',
//     labelNames: ['stream_type', 'quality'],
//     buckets: [60, 300, 900, 1800, 3600, 7200, 14400]
//   });

//   private bandwidthPerUser = new Histogram({
//     name: 'streaming_bandwidth_per_user_bytes',
//     help: 'Bandwidth usage per user in bytes per second',
//     labelNames: ['user_type', 'stream_quality'],
//     buckets: [100000, 500000, 1000000, 2000000, 5000000, 10000000]
//   });

//   constructor() {
//     // Register all metrics
//     register.registerMetric(this.httpRequestsTotal);
//     register.registerMetric(this.httpRequestDuration);
//     register.registerMetric(this.activeConnections);
//     register.registerMetric(this.concurrentUsers);
//     register.registerMetric(this.activeStreams);
//     register.registerMetric(this.totalBandwidth);
//     register.registerMetric(this.cdnHitRate);
//     register.registerMetric(this.queueLength);
//     register.registerMetric(this.roomCount);
//     register.registerMetric(this.streamQualityDistribution);
//     register.registerMetric(this.userRoleDistribution);
//     register.registerMetric(this.deviceTypeDistribution);
//     register.registerMetric(this.apiResponseTime);
//     register.registerMetric(this.databaseConnections);
//     register.registerMetric(this.redisConnections);
//     register.registerMetric(this.cacheHitRate);
//     register.registerMetric(this.errorRate);
//     register.registerMetric(this.streamStartTime);
//     register.registerMetric(this.streamDuration);
//     register.registerMetric(this.bandwidthPerUser);

//     // Start metrics collection
//     this.startMetricsCollection();
//   }

//   // HTTP Request Metrics
//   recordHttpRequest(method: string, route: string, statusCode: number, duration: number): void {
//     this.httpRequestsTotal.inc({ method, route, status_code: statusCode.toString() });
//     this.httpRequestDuration.observe({ method, route, status_code: statusCode.toString() }, duration);
//   }

//   // API Response Time
//   recordApiResponseTime(endpoint: string, method: string, duration: number): void {
//     this.apiResponseTime.observe({ endpoint, method }, duration);
//   }

//   // User Metrics
//   async updateUserMetrics(): Promise<void> {
//     try {
//       const onlineUsers = await SessionService.getOnlineUsersCount();
//       this.concurrentUsers.set(onlineUsers);

//       // Update user role distribution
//       const onlineUsersList = await SessionService['redis'].smembers('online_users');
//       const roleCounts = { user: 0, admin: 0, guest: 0 };
//       const deviceCounts = { desktop: 0, mobile: 0 };

//       for (const sessionId of onlineUsersList) {
//         const session = await SessionService.getSession(sessionId);
//         if (session) {
//           roleCounts[session.role]++;
//           deviceCounts[session.deviceType]++;
//         }
//       }

//       this.userRoleDistribution.set({ role: 'user' }, roleCounts.user);
//       this.userRoleDistribution.set({ role: 'admin' }, roleCounts.admin);
//       this.userRoleDistribution.set({ role: 'guest' }, roleCounts.guest);

//       this.deviceTypeDistribution.set({ device_type: 'desktop' }, deviceCounts.desktop);
//       this.deviceTypeDistribution.set({ device_type: 'mobile' }, deviceCounts.mobile);
//     } catch (error) {
//       console.error('Error updating user metrics:', error);
//     }
//   }

//   // Stream Metrics
//   async updateStreamMetrics(): Promise<void> {
//     try {
//       const activeStreams = await SessionService.getActiveStreastreamingount();
//       this.activeStreams.set(activeStreams);

//       const bandwidthUsage = await SessionService.getBandwidthUsage();
//       this.totalBandwidth.set(bandwidthUsage);

//       // Update stream quality distribution
//       const activeStreamsList = await SessionService['streamRedis'].smembers('active_streams');
//       const qualityCounts = { '1080p': 0, '720p': 0, '480p': 0 };

//       for (const sessionId of activeStreamsList) {
//         const streamSession = await SessionService.getStreamSession(sessionId);
//         if (streamSession) {
//           qualityCounts[streamSession.quality as keyof typeof qualityCounts]++;
//         }
//       }

//       this.streamQualityDistribution.set({ quality: '1080p' }, qualityCounts['1080p']);
//       this.streamQualityDistribution.set({ quality: '720p' }, qualityCounts['720p']);
//       this.streamQualityDistribution.set({ quality: '480p' }, qualityCounts['480p']);
//     } catch (error) {
//       console.error('Error updating stream metrics:', error);
//     }
//   }

//   // Room Metrics
//   async updateRoomMetrics(): Promise<void> {
//     try {
//       // This would need to be implemented based on your room management system
//       // For now, we'll set a placeholder value
//       this.roomCount.set(0);
//     } catch (error) {
//       console.error('Error updating room metrics:', error);
//     }
//   }

//   // Error Metrics
//   recordError(errorType: string, component: string): void {
//     this.errorRate.inc({ error_type: errorType, component });
//   }

//   // Stream Metrics
//   recordStreamStart(streamType: string, quality: string, startTime: number): void {
//     this.streamStartTime.observe({ stream_type: streamType, quality }, startTime);
//   }

//   recordStreamDuration(streamType: string, quality: string, duration: number): void {
//     this.streamDuration.observe({ stream_type: streamType, quality }, duration);
//   }

//   recordBandwidthPerUser(userType: string, streamQuality: string, bandwidth: number): void {
//     this.bandwidthPerUser.observe({ user_type: userType, stream_quality: streamQuality }, bandwidth);
//   }

//   // Connection Metrics
//   updateConnectionMetrics(activeConnections: number): void {
//     this.activeConnections.set(activeConnections);
//   }

//   updateDatabaseConnections(connections: number): void {
//     this.databaseConnections.set(connections);
//   }

//   updateRedisConnections(connections: number): void {
//     this.redisConnections.set(connections);
//   }

//   // CDN Metrics
//   updateCDNHitRate(hitRate: number): void {
//     this.cdnHitRate.set(hitRate);
//   }

//   // Cache Metrics
//   updateCacheHitRate(hitRate: number): void {
//     this.cacheHitRate.set(hitRate);
//   }

//   // Queue Metrics
//   updateQueueLength(length: number): void {
//     this.queueLength.set(length);
//   }

//   // Get metrics for Prometheus
//   async getMetrics(): Promise<string> {
//     return register.metrics();
//   }

//   // Start periodic metrics collection
//   private startMetricsCollection(): void {
//     // Update metrics every 30 seconds
//     setInterval(async () => {
//       await this.updateUserMetrics();
//       await this.updateStreamMetrics();
//       await this.updateRoomMetrics();
//     }, 30000);

//     // Update connection metrics every 10 seconds
//     setInterval(() => {
//       // This would need to be implemented based on your connection tracking
//       this.updateConnectionMetrics(0);
//     }, 10000);
//   }

//   // Health check metrics
//   async getHealthMetrics(): Promise<any> {
//     try {
//       const redisHealth = await SessionService.healthCheck();
//       const onlineUsers = await SessionService.getOnlineUsersCount();
//       const activeStreams = await SessionService.getActiveStreastreamingount();
//       const bandwidthUsage = await SessionService.getBandwidthUsage();

//       return {
//         status: 'healthy',
//         timestamp: Date.now(),
//         redis: redisHealth ? 'healthy' : 'unhealthy',
//         onlineUsers,
//         activeStreams,
//         bandwidthUsage,
//         uptime: process.uptime()
//       };
//     } catch (error) {
//       return {
//         status: 'unhealthy',
//         timestamp: Date.now(),
//         error: error.message,
//         uptime: process.uptime()
//       };
//     }
//   }
// }

// export default new MetricsService();
