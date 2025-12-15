import { getDB } from "../config/db.config";
import { AlertNotificationService } from "./alertNotification.service";

// Configuration for anomaly detection thresholds
export interface AnomalyThresholds {
  requestsPerMinute: number;
  requestsPerHour: number;
  errorRatePercentage: number;
  responseTimeMs: number;
  suspiciousRequestThreshold: number;
  bruteForceAttempts: number;
  bruteForceTimeWindowMinutes: number;
}

const DEFAULT_THRESHOLDS: AnomalyThresholds = {
  requestsPerMinute: 100,      // More than 100 requests per minute from single IP
  requestsPerHour: 5000,       // More than 1000 requests per hour from single IP
  errorRatePercentage: 50,     // More than 50% error rate
  responseTimeMs: 5000,        // Response time > 5 seconds
  suspiciousRequestThreshold: 10, // 5 suspicious requests in time window
  bruteForceAttempts: 10,      // 10 failed login attempts
  bruteForceTimeWindowMinutes: 15 // Within 15 minutes
};

export class AnomalyDetectionService {
  private static thresholds: AnomalyThresholds = DEFAULT_THRESHOLDS;

  /**
   * Update detection thresholds
   */
  static setThresholds(thresholds: Partial<AnomalyThresholds>): void {
    this.thresholds = { ...this.thresholds, ...thresholds };
  }

  /**
   * Get current thresholds
   */
  static getThresholds(): AnomalyThresholds {
    return { ...this.thresholds };
  }

  /**
   * Main traffic analysis function
   */
  static async analyzeTraffic(ip: string, endpoint?: string): Promise<void> {
    try {
      // Run multiple checks in parallel
      await Promise.all([
        this.checkTrafficSpike(ip),
        this.checkSuspiciousActivity(ip),
        this.checkBruteForceAttempt(ip, endpoint),
        this.checkDDoSPattern(ip),
        this.checkErrorRate(ip)
      ]);
    } catch (error) {
      console.error('Error during anomaly detection:', error);
    }
  }

  /**
   * Check for traffic spikes
   */
  static async checkTrafficSpike(ip: string): Promise<void> {
    const oneMinuteAgo = new Date(Date.now() - 60 * 1000);
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

    // Check requests per minute
    const db = getDB();
    const recentRequestsResult = await db('traffic_logs')
      .where('ip', ip)
      .where('timestamp', '>=', oneMinuteAgo)
      .count('* as count')
      .first();
    const recentRequests = recentRequestsResult ? Number(recentRequestsResult.count) : 0;

    if (recentRequests > this.thresholds.requestsPerMinute) {
      await this.createAlert({
        type: 'traffic_spike',
        severity: recentRequests > this.thresholds.requestsPerMinute * 2 ? 'critical' : 'high',
        title: `Traffic Spike Detected from ${ip}`,
        message: `Detected ${recentRequests} requests in the last minute from IP ${ip}`,
        ipAddress: ip,
        metrics: {
          requestCount: recentRequests,
          timeWindow: 60,
          threshold: this.thresholds.requestsPerMinute
        }
      });
    }

    // Check requests per hour
    const hourlyRequestsResult = await db('traffic_logs')
      .where('ip', ip)
      .where('timestamp', '>=', oneHourAgo)
      .count('* as count')
      .first();
    const hourlyRequests = hourlyRequestsResult ? Number(hourlyRequestsResult.count) : 0;

    if (hourlyRequests > this.thresholds.requestsPerHour) {
      await this.createAlert({
        type: 'traffic_spike',
        severity: 'high',
        title: `High Traffic Volume from ${ip}`,
        message: `Detected ${hourlyRequests} requests in the last hour from IP ${ip}`,
        ipAddress: ip,
        metrics: {
          requestCount: hourlyRequests,
          timeWindow: 3600,
          threshold: this.thresholds.requestsPerHour
        }
      });
    }
  }

  /**
   * Check for suspicious activity patterns
   */
  static async checkSuspiciousActivity(ip: string): Promise<void> {
    const db = getDB();
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);

    const suspiciousLogs = await db('traffic_logs')
      .where('ip', ip)
      .where('suspicious', true)
      .where('timestamp', '>=', fiveMinutesAgo)
      .limit(20);

    if (suspiciousLogs.length >= this.thresholds.suspiciousRequestThreshold) {
      const patterns = new Set<string>();
      suspiciousLogs.forEach((log: any) => {
        if (log.suspicion_reasons && Array.isArray(log.suspicion_reasons)) {
          log.suspicion_reasons.forEach((reason: string) => patterns.add(reason));
        }
      });

      await this.createAlert({
        type: 'suspicious_activity',
        severity: 'high',
        title: `Suspicious Activity Detected from ${ip}`,
        message: `Detected ${suspiciousLogs.length} suspicious requests in 5 minutes from IP ${ip}`,
        ipAddress: ip,
        metrics: {
          requestCount: suspiciousLogs.length,
          timeWindow: 300,
          suspiciousPatterns: Array.from(patterns)
        },
        relatedLogs: suspiciousLogs.map((log: any) => log.id.toString())
      });
    }
  }

  /**
   * Check for brute force attempts
   */
  static async checkBruteForceAttempt(ip: string, endpoint?: string): Promise<void> {
    if (!endpoint || (!endpoint.includes('login') && !endpoint.includes('auth'))) {
      return;
    }

    const db = getDB();
    const timeWindow = new Date(Date.now() - this.thresholds.bruteForceTimeWindowMinutes * 60 * 1000);

    const failedAttemptsResult = await db('traffic_logs')
      .where('ip', ip)
      .where(function(this: any) {
        this.where('url', 'ilike', '%login%').orWhere('url', 'ilike', '%auth%');
      })
      .whereIn('status_code', [401, 403])
      .where('timestamp', '>=', timeWindow)
      .count('* as count')
      .first();
    const failedAttempts = failedAttemptsResult ? Number(failedAttemptsResult.count) : 0;

    if (failedAttempts >= this.thresholds.bruteForceAttempts) {
      await this.createAlert({
        type: 'brute_force',
        severity: 'critical',
        title: `Brute Force Attack Detected from ${ip}`,
        message: `Detected ${failedAttempts} failed login attempts in ${this.thresholds.bruteForceTimeWindowMinutes} minutes from IP ${ip}`,
        ipAddress: ip,
        affectedEndpoint: endpoint,
        metrics: {
          requestCount: failedAttempts,
          timeWindow: this.thresholds.bruteForceTimeWindowMinutes * 60,
          threshold: this.thresholds.bruteForceAttempts
        }
      });
    }
  }

  /**
   * Check for DDoS patterns
   */
  static async checkDDoSPattern(ip: string): Promise<void> {
    const db = getDB();
    const oneMinuteAgo = new Date(Date.now() - 60 * 1000);

    // Check for rapid repeated requests to same endpoint
    const logsResult = await db('traffic_logs')
      .where('ip', ip)
      .where('timestamp', '>=', oneMinuteAgo)
      .select('url')
      .count('* as count')
      .groupBy('url')
      .having(db.raw('count(*)'), '>=', 50); // Same endpoint hit 50+ times in a minute
    
    const logs = logsResult.map((item: any) => ({
      _id: item.url,
      count: Number(item.count)
    }));

    if (logs.length > 0) {
      await this.createAlert({
        type: 'ddos_attempt',
        severity: 'critical',
        title: `Potential DDoS Attack from ${ip}`,
        message: `Detected repeated requests to same endpoints from IP ${ip}. Possible DDoS attempt.`,
        ipAddress: ip,
        affectedEndpoint: logs[0]._id,
        metrics: {
          requestCount: logs[0].count,
          timeWindow: 60
        }
      });
    }
  }

  /**
   * Check error rate
   */
  static async checkErrorRate(ip: string): Promise<void> {
    const db = getDB();
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);

    const totalRequestsResult = await db('traffic_logs')
      .where('ip', ip)
      .where('timestamp', '>=', fiveMinutesAgo)
      .count('* as count')
      .first();
    const totalRequests = totalRequestsResult ? Number(totalRequestsResult.count) : 0;

    if (totalRequests < 10) return; // Need minimum requests to calculate meaningful rate

    const errorRequestsResult = await db('traffic_logs')
      .where('ip', ip)
      .where('timestamp', '>=', fiveMinutesAgo)
      .where('status_code', '>=', 400)
      .count('* as count')
      .first();
    const errorRequests = errorRequestsResult ? Number(errorRequestsResult.count) : 0;

    const errorRate = (errorRequests / totalRequests) * 100;

    if (errorRate > this.thresholds.errorRatePercentage) {
      await this.createAlert({
        type: 'abnormal_pattern',
        severity: errorRate > 75 ? 'high' : 'medium',
        title: `High Error Rate from ${ip}`,
        message: `Detected ${errorRate.toFixed(1)}% error rate from IP ${ip} (${errorRequests}/${totalRequests} requests)`,
        ipAddress: ip,
        metrics: {
          requestCount: totalRequests,
          errorRate: parseFloat(errorRate.toFixed(2)),
          threshold: this.thresholds.errorRatePercentage,
          timeWindow: 300
        }
      });
    }
  }

  /**
   * Create alert and notify admins
   */
  private static async createAlert(alertData: any): Promise<void> {
    try {
      // Check if similar alert exists in last 10 minutes (avoid spam)
      const db = getDB();
      const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
      const existingAlert = await db('alerts')
        .where('type', alertData.type)
        .where('ip_address', alertData.ipAddress)
        .whereIn('status', [0, 1]) // 0 = new, 1 = acknowledged
        .where('created_at', '>=', tenMinutesAgo)
        .first();

      if (existingAlert) {
        console.log(`Similar alert already exists for ${alertData.ipAddress}, skipping duplicate`);
        return;
      }

      // Create new alert
      const [alert] = await db('alerts')
        .insert({
          type: alertData.type,
          severity: alertData.severity,
          title: alertData.title,
          message: alertData.message,
          ip_address: alertData.ipAddress || null,
          affected_endpoint: alertData.affectedEndpoint || null,
          metrics_request_count: alertData.metrics?.requestCount || null,
          metrics_time_window: alertData.metrics?.timeWindow || null,
          metrics_threshold: alertData.metrics?.threshold || null,
          metrics_error_rate: alertData.metrics?.errorRate || null,
          metrics_suspicious_patterns: alertData.metrics?.suspiciousPatterns ? JSON.stringify(alertData.metrics.suspiciousPatterns) : null,
          related_logs: alertData.relatedLogs ? JSON.stringify(alertData.relatedLogs) : null,
          status: 0, // 0 = new
          created_at: db.fn.now(),
          updated_at: db.fn.now()
        })
        .returning('*');

      // Notify admins
      await AlertNotificationService.notifyAdmins(alert);

    } catch (error) {
      console.error('Error creating alert:', error);
    }
  }

  /**
   * Get traffic statistics for dashboard
   */
  static async getTrafficStatistics(timeRange: number = 3600): Promise<any> {
    const startTime = new Date(Date.now() - timeRange * 1000);

    const db = getDB();
    const statsResult = await db('traffic_logs')
      .where('timestamp', '>=', startTime)
      .select(
        db.raw('COUNT(*) as total_requests'),
        db.raw('SUM(CASE WHEN suspicious = true THEN 1 ELSE 0 END) as suspicious_requests'),
        db.raw('SUM(CASE WHEN status_code >= 400 THEN 1 ELSE 0 END) as error_requests'),
        db.raw('AVG(response_time) as avg_response_time')
      )
      .first();
    
    const uniqueIPsResult = await db('traffic_logs')
      .where('timestamp', '>=', startTime)
      .distinct('ip');
    
    const stats = [{
      totalRequests: Number(statsResult?.total_requests || 0),
      suspiciousRequests: Number(statsResult?.suspicious_requests || 0),
      errorRequests: Number(statsResult?.error_requests || 0),
      avgResponseTime: Number(statsResult?.avg_response_time || 0),
      uniqueIPs: uniqueIPsResult.map((item: any) => item.ip)
    }];

    const topIPsResult = await db('traffic_logs')
      .where('timestamp', '>=', startTime)
      .select('ip')
      .count('* as count')
      .select(db.raw("SUM(CASE WHEN suspicious = true THEN 1 ELSE 0 END) as suspicious_count"))
      .groupBy('ip')
      .orderBy('count', 'desc')
      .limit(10);
    
    const topIPs = topIPsResult.map((item: any) => ({
      _id: item.ip,
      count: Number(item.count),
      suspiciousCount: Number(item.suspicious_count || 0)
    }));

    const topEndpointsResult = await db('traffic_logs')
      .where('timestamp', '>=', startTime)
      .select('url')
      .count('* as count')
      .avg('response_time as avg_response_time')
      .groupBy('url')
      .orderBy('count', 'desc')
      .limit(10);
    
    const topEndpoints = topEndpointsResult.map((item: any) => ({
      _id: item.url,
      count: Number(item.count),
      avgResponseTime: Number(item.avg_response_time || 0)
    }));

    return {
      period: timeRange,
      summary: stats[0] || {
        totalRequests: 0,
        suspiciousRequests: 0,
        errorRequests: 0,
        avgResponseTime: 0,
        uniqueIPs: []
      },
      topIPs,
      topEndpoints,
      uniqueIPCount: stats[0]?.uniqueIPs?.length || 0
    };
  }
}

export default AnomalyDetectionService;

