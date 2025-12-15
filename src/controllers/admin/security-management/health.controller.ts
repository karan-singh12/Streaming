import { Request, Response, NextFunction } from "express";
import { AuthenticatedRequest } from "../../../types/auth.types";
import { getDB } from "../../../config/db.config";
import { AnomalyDetectionService } from "../../../services/anomalyDetection.service";
import * as apiRes from "../../../utils/apiResponse";

// Health Check API - Comprehensive system health monitoring
export const healthCheck = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const startTime = Date.now();
    const healthStatus: any = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      checks: {}
    };

    // 1. Database Health Check
    try {
      const db = getDB();
      const dbPingStart = Date.now();

      // Test database connection with a simple query
      await db.raw('SELECT 1');
      const responseTime = Date.now() - dbPingStart;

      // Get database info
      const dbInfo = await db.raw("SELECT current_database() as name, inet_server_addr() as host");
      const dbName = dbInfo.rows[0]?.name || 'unknown';
      const dbHost = dbInfo.rows[0]?.host || 'unknown';

      // Get table count
      const tableCount = await db.raw(`
        SELECT COUNT(*) as count 
        FROM information_schema.tables 
        WHERE table_schema = 'public'
      `);
      const tableCountNum = tableCount.rows[0]?.count || 0;

      healthStatus.checks.database = {
        status: 'healthy',
        state: 'connected',
        name: dbName,
        host: dbHost,
        responseTime: `${responseTime}ms`,
        tableCount: Number(tableCountNum)
      };
    } catch (error: any) {
      healthStatus.checks.database = {
        status: 'unhealthy',
        error: error.message
      };
      healthStatus.status = 'degraded';
    }

    // 2. Memory Usage
    const memUsage = process.memoryUsage();
    healthStatus.checks.memory = {
      status: 'healthy',
      rss: `${Math.round(memUsage.rss / 1024 / 1024)}MB`,
      heapTotal: `${Math.round(memUsage.heapTotal / 1024 / 1024)}MB`,
      heapUsed: `${Math.round(memUsage.heapUsed / 1024 / 1024)}MB`,
      external: `${Math.round(memUsage.external / 1024 / 1024)}MB`,
      heapUsedPercentage: `${Math.round((memUsage.heapUsed / memUsage.heapTotal) * 100)}%`
    };

    // Mark as warning if heap usage > 85%
    if ((memUsage.heapUsed / memUsage.heapTotal) > 0.85) {
      healthStatus.checks.memory.status = 'warning';
      healthStatus.status = 'degraded';
    }

    // 3. Traffic Monitoring System
    try {
      const db = getDB();
      const oneMinuteAgo = new Date(Date.now() - 60 * 1000);
      const recentLogsResult = await db('traffic_logs')
        .where('timestamp', '>=', oneMinuteAgo)
        .count('* as count')
        .first();
      const recentLogs = recentLogsResult ? Number(recentLogsResult.count) : 0;

      healthStatus.checks.trafficMonitoring = {
        status: 'healthy',
        recentRequests: recentLogs,
        monitoring: 'active'
      };
    } catch (error: any) {
      healthStatus.checks.trafficMonitoring = {
        status: 'unhealthy',
        error: error.message
      };
      healthStatus.status = 'degraded';
    }

    // 4. Alert System
    try {
      const db = getDB();
      const newAlerts = await db('alerts')
        .where('status', 0) // 0 = new
        .count('* as count')
        .first();
      const newAlertsCount = newAlerts ? Number(newAlerts.count) : 0;

      const criticalAlerts = await db('alerts')
        .where('severity', 'critical')
        .whereIn('status', [0, 1]) // 0 = new, 1 = acknowledged
        .count('* as count')
        .first();
      const criticalAlertsCount = criticalAlerts ? Number(criticalAlerts.count) : 0;

      healthStatus.checks.alertSystem = {
        status: criticalAlertsCount > 10 ? 'warning' : 'healthy',
        newAlerts: newAlertsCount,
        criticalAlerts: criticalAlertsCount,
        monitoring: 'active'
      };

      if (criticalAlertsCount > 10) {
        healthStatus.status = 'degraded';
      }
    } catch (error: any) {
      healthStatus.checks.alertSystem = {
        status: 'unhealthy',
        error: error.message
      };
      healthStatus.status = 'degraded';
    }

    // 5. Environment Variables Check
    const requiredEnvVars = [
      'TOKEN_SECRET_KEY_1',
      'TOKEN_SECRET_KEY_2',
      'ADMIN_TOKEN_EXPIRE',
      'DB_URL'
    ];

    const missingEnvVars = requiredEnvVars.filter(varName => !process.env[varName]);
    healthStatus.checks.environment = {
      status: missingEnvVars.length === 0 ? 'healthy' : 'unhealthy',
      node_env: process.env.NODE_ENV || 'development',
      missing_variables: missingEnvVars.length > 0 ? missingEnvVars : undefined
    };

    if (missingEnvVars.length > 0) {
      healthStatus.status = 'degraded';
    }

    // 6. Anomaly Detection Service
    try {
      const thresholds = AnomalyDetectionService.getThresholds();
      healthStatus.checks.anomalyDetection = {
        status: 'healthy',
        service: 'active',
        thresholds: {
          requestsPerMinute: thresholds.requestsPerMinute,
          requestsPerHour: thresholds.requestsPerHour,
          bruteForceAttempts: thresholds.bruteForceAttempts
        }
      };
    } catch (error: any) {
      healthStatus.checks.anomalyDetection = {
        status: 'unhealthy',
        error: error.message
      };
      healthStatus.status = 'degraded';
    }

    // 7. System Information
    healthStatus.system = {
      platform: process.platform,
      nodeVersion: process.version,
      cpuUsage: process.cpuUsage(),
      pid: process.pid
    };

    // 8. Response Time
    healthStatus.responseTime = `${Date.now() - startTime}ms`;

    // Determine overall status
    const unhealthyChecks = Object.values(healthStatus.checks).filter(
      (check: any) => check.status === 'unhealthy'
    ).length;

    if (unhealthyChecks > 0) {
      healthStatus.status = unhealthyChecks >= 2 ? 'unhealthy' : 'degraded';
    }

    // Set HTTP status code based on health
    const httpStatusCode = healthStatus.status === 'healthy' ? 200 :
      healthStatus.status === 'degraded' ? 200 : 503;

    res.status(httpStatusCode).json({
      success: true,
      message: `System is ${healthStatus.status}`,
      data: healthStatus
    });
  } catch (error: any) {
    res.status(503).json({
      success: false,
      message: 'Health check failed',
      error: error.message
    });
  }
};

// Simple Health Check (for load balancers and monitoring tools)
export const simpleHealthCheck = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Quick database ping
    const db = getDB();
    await db.raw('SELECT 1');

    res.status(200).json({
      status: 'healthy',
      message: 'Service is running',
      timestamp: new Date().toISOString(),
      uptime: Math.floor(process.uptime())
    });
  } catch (error: any) {
    res.status(503).json({
      status: 'unhealthy',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
};