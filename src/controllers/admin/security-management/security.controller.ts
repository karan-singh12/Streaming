import { Response, NextFunction } from "express";
import { AuthenticatedRequest } from "../../../types/auth.types";
import { getDB } from "../../../config/db.config";
import { AnomalyDetectionService } from "../../../services/anomalyDetection.service";
import { AlertNotificationService } from "../../../services/alertNotification.service";
import * as apiRes from "../../../utils/apiResponse";
import { SUCCESS, ERROR } from "../../../utils/responseMssg";
import { log } from '../../../utils/logger';
import { v4 as uuidv4 } from "uuid";

// Get all alerts with filtering and pagination
export const getAlerts = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const db = getDB();
    const { 
      status, 
      severity, 
      type,
      page = 1, 
      limit = 20,
      startDate,
      endDate
    } = req.query;

    const offset = (Number(page) - 1) * Number(limit);

    let query = db('alerts');

    // Build filter
    // Map status string to integer: "new" -> 0, "acknowledged" -> 1, "resolved" -> 2
    if (status) {
      let statusValue: number;
      if (typeof status === 'string') {
        const statusMap: { [key: string]: number } = {
          'new': 0,
          'acknowledged': 1,
          'acknowledge': 1,
          'resolved': 2,
          'resolve': 2
        };
        statusValue = statusMap[status.toLowerCase()] !== undefined 
          ? statusMap[status.toLowerCase()] 
          : Number(status);
      } else {
        statusValue = Number(status);
      }
      
      // Only apply filter if statusValue is a valid number
      if (!isNaN(statusValue)) {
        query = query.where('status', statusValue);
      }
    }
    
    if (severity) query = query.where('severity', severity);
    if (type) query = query.where('type', type);
    
    if (startDate || endDate) {
      if (startDate) query = query.where('created_at', '>=', new Date(startDate as string));
      if (endDate) query = query.where('created_at', '<=', new Date(endDate as string));
    }

    // Get total count
    const totalResult = await query.clone().count('* as count').first();
    const total = totalResult ? Number(totalResult.count) : 0;

    // Get alerts with pagination
    const alerts = await query
      .orderBy('created_at', 'desc')
      .limit(Number(limit))
      .offset(offset);

    apiRes.successResponseWithData(res, SUCCESS.dataFound, {
      alerts,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit))
      }
    });
  } catch (error: any) {
    log(error.message);
    apiRes.errorResponse(res, ERROR.SomethingWrong);
    return;
  }
};

// Get alert by ID
export const getAlertById = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const db = getDB();
    const { id } = req.params;

    const alert = await db('alerts')
      .where('id', id)
      .first();

    if (!alert) {
      apiRes.errorResponse(res, "Alert not found");
      return;
    }

    // Get related traffic logs if available
    let relatedLogs: any[] = [];
    if (alert.related_logs) {
      // Parse related_logs if it's stored as JSON
      try {
        const logIds = typeof alert.related_logs === 'string' 
          ? JSON.parse(alert.related_logs) 
          : alert.related_logs;
        
        if (Array.isArray(logIds) && logIds.length > 0) {
          relatedLogs = await db('traffic_logs')
            .whereIn('id', logIds)
            .limit(50);
        }
      } catch (e) {
        relatedLogs = [];
      }
    }

    apiRes.successResponseWithData(res, SUCCESS.dataFound, {
      alert,
      relatedLogs
    });
  } catch (error: any) {
    log(error.message);
    apiRes.errorResponse(res, ERROR.SomethingWrong);
    return;
  }
};

// Acknowledge an alert
export const acknowledgeAlert = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const db = getDB();
    if (!req.user?._id && !req.user?.id) {
      apiRes.errorResponse(res, "Unauthorized");
      return;
    }

    const { id } = req.params;
    const adminId = req.user?._id || req.user?.id;

    const alert = await db('alerts')
      .where('id', id)
      .first();

    if (!alert) {
      apiRes.errorResponse(res, "Alert not found");
      return;
    }

    await db('alerts')
      .where('id', id)
      .update({
        status: 1, // 1 = acknowledged
        acknowledged_by: adminId?.toString(),
        acknowledged_at: db.fn.now(),
        updated_at: db.fn.now()
      });

    const updatedAlert = await db('alerts').where('id', id).first();

    apiRes.successResponseWithData(res, "Alert acknowledged successfully", updatedAlert);
  } catch (error: any) {
    log(error.message);
    apiRes.errorResponse(res, ERROR.SomethingWrong);
    return;
  }
};

// Resolve an alert
export const resolveAlert = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const db = getDB();
    const { id } = req.params;

    const alert = await db('alerts')
      .where('id', id)
      .first();

    if (!alert) {
      apiRes.errorResponse(res, "Alert not found");
      return;
    }

    await db('alerts')
      .where('id', id)
      .update({
        status: 2, // 2 = resolved
        resolved_at: db.fn.now(),
        updated_at: db.fn.now()
      });

    const updatedAlert = await db('alerts').where('id', id).first();

    apiRes.successResponseWithData(res, "Alert resolved successfully", updatedAlert);
  } catch (error: any) {
    log(error.message);
    apiRes.errorResponse(res, ERROR.SomethingWrong);
    return;
  }
};

// Mark alert as false positive
export const markAsFalsePositive = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const db = getDB();
    const { id } = req.params;

    const alert = await db('alerts')
      .where('id', id)
      .first();

    if (!alert) {
      apiRes.errorResponse(res, "Alert not found");
      return;
    }

    await db('alerts')
      .where('id', id)
      .update({
        status: 'false_positive',
        updated_at: db.fn.now()
      });

    const updatedAlert = await db('alerts').where('id', id).first();

    apiRes.successResponseWithData(res, "Alert marked as false positive", updatedAlert);
  } catch (error: any) {
    log(error.message);
    apiRes.errorResponse(res, ERROR.SomethingWrong);
    return;
  }
};

// Get alert statistics
export const getAlertStatistics = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const db = getDB();
    const { days = 7 } = req.query;
    const startDate = new Date(Date.now() - Number(days) * 24 * 60 * 60 * 1000);

    // Get alert counts by severity
    const bySeverityResult = await db('alerts')
      .where('created_at', '>=', startDate)
      .select('severity')
      .count('* as count')
      .groupBy('severity');
    const bySeverity = bySeverityResult.map((item: any) => ({
      _id: item.severity,
      count: Number(item.count)
    }));

    // Get alert counts by type
    const byTypeResult = await db('alerts')
      .where('created_at', '>=', startDate)
      .select('type')
      .count('* as count')
      .groupBy('type');
    const byType = byTypeResult.map((item: any) => ({
      _id: item.type,
      count: Number(item.count)
    }));

    // Get alert counts by status
    const byStatusResult = await db('alerts')
      .where('created_at', '>=', startDate)
      .select('status')
      .count('* as count')
      .groupBy('status');
    const byStatus = byStatusResult.map((item: any) => ({
      _id: item.status,
      count: Number(item.count)
    }));

    // Get daily alert trend
    const dailyTrendResult = await db('alerts')
      .where('created_at', '>=', startDate)
      .select(db.raw("DATE(created_at) as date"))
      .count('* as count')
      .sum(db.raw("CASE WHEN severity = 'critical' THEN 1 ELSE 0 END as critical"))
      .sum(db.raw("CASE WHEN severity = 'high' THEN 1 ELSE 0 END as high"))
      .groupBy(db.raw("DATE(created_at)"))
      .orderBy('date', 'asc');
    const dailyTrend = dailyTrendResult.map((item: any) => ({
      _id: item.date.toISOString().split('T')[0],
      count: Number(item.count),
      critical: Number(item.critical || 0),
      high: Number(item.high || 0)
    }));

    // Get top suspicious IPs
    const topSuspiciousIPsResult = await db('alerts')
      .where('created_at', '>=', startDate)
      .whereNotNull('ip_address')
      .select('ip_address')
      .count('* as count')
      .max('created_at as latest_alert')
      .groupBy('ip_address')
      .orderBy('count', 'desc')
      .limit(10);
    
    const topSuspiciousIPs = await Promise.all(
      topSuspiciousIPsResult.map(async (item: any) => {
        const types = await db('alerts')
          .where('ip_address', item.ip_address)
          .where('created_at', '>=', startDate)
          .distinct('type');
        return {
          _id: item.ip_address,
          count: Number(item.count),
          types: types.map((t: any) => t.type),
          latestAlert: item.latest_alert
        };
      })
    );

    const totalAlertsResult = await db('alerts')
      .where('created_at', '>=', startDate)
      .count('* as count')
      .first();
    const totalAlerts = totalAlertsResult ? Number(totalAlertsResult.count) : 0;

    apiRes.successResponseWithData(res, SUCCESS.dataFound, {
      period: `Last ${days} days`,
      totalAlerts,
      bySeverity,
      byType,
      byStatus,
      dailyTrend,
      topSuspiciousIPs
    });
  } catch (error: any) {
    log(error.message);
    apiRes.errorResponse(res, ERROR.SomethingWrong);
    return;
  }
};

// Get traffic logs with filtering and pagination
export const getTrafficLogs = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const db = getDB();
    const {
      ip,
      suspicious,
      statusCode,
      method,
      page = 1,
      limit = 50,
      startDate,
      endDate
    } = req.query;

    const offset = (Number(page) - 1) * Number(limit);

    let query = db('traffic_logs');

    // Build filter
    if (ip) query = query.where('ip', ip);
    if (suspicious !== undefined) query = query.where('suspicious', suspicious === 'true');
    if (statusCode) query = query.where('status_code', Number(statusCode));
    if (method) query = query.where('method', method);

    if (startDate || endDate) {
      if (startDate) query = query.where('timestamp', '>=', new Date(startDate as string));
      if (endDate) query = query.where('timestamp', '<=', new Date(endDate as string));
    }

    // Get total count
    const totalResult = await query.clone().count('* as count').first();
    const total = totalResult ? Number(totalResult.count) : 0;

    // Get logs with pagination
    const logs = await query
      .orderBy('timestamp', 'desc')
      .limit(Number(limit))
      .offset(offset);

    apiRes.successResponseWithData(res, SUCCESS.dataFound, {
      logs,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit))
      }
    });
  } catch (error: any) {
    log(error.message);
    apiRes.errorResponse(res, ERROR.SomethingWrong);
    return;
  }
};

// Get traffic statistics
export const getTrafficStatistics = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { timeRange = 3600 } = req.query; // Default 1 hour

    const stats = await AnomalyDetectionService.getTrafficStatistics(Number(timeRange));

    apiRes.successResponseWithData(res, SUCCESS.dataFound, stats);
  } catch (error: any) {
    log(error.message);
    apiRes.errorResponse(res, ERROR.SomethingWrong);
    return;
  }
};

// Get anomaly detection thresholds
export const getThresholds = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const thresholds = AnomalyDetectionService.getThresholds();
    apiRes.successResponseWithData(res, SUCCESS.dataFound, thresholds);
  } catch (error: any) {
    log(error.message);
    apiRes.errorResponse(res, ERROR.SomethingWrong);
    return;
  }
};

//Update anomaly detection thresholds
export const updateThresholds = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const thresholds = req.body;

    // Validate thresholds
    const validKeys = [
      'requestsPerMinute',
      'requestsPerHour',
      'errorRatePercentage',
      'responseTimeMs',
      'suspiciousRequestThreshold',
      'bruteForceAttempts',
      'bruteForceTimeWindowMinutes'
    ];

    const updates: any = {};
    for (const key of validKeys) {
      if (thresholds[key] !== undefined) {
        const value = Number(thresholds[key]);
        if (isNaN(value) || value < 0) {
          apiRes.validationError(res, `Invalid value for ${key}`);
          return;
        }
        updates[key] = value;
      }
    }

    AnomalyDetectionService.setThresholds(updates);

    const updatedThresholds = AnomalyDetectionService.getThresholds();
    apiRes.successResponseWithData(res, "Thresholds updated successfully", updatedThresholds);
  } catch (error: any) {
    log(error.message);
    apiRes.errorResponse(res, ERROR.SomethingWrong);
    return;
  }
};

//Block/unblock IP address
export const blockIP = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { 
      ip, 
      reason, 
      duration = 0,
      methods = ['nginx', 'database']
    } = req.body;

    // Validation
    if (!ip) {
      apiRes.validationError(res, "IP address is required");
      return;
    }

    if (!req.user?._id) {
      apiRes.errorResponse(res, "Unauthorized");
      return;
    }

    // Validate IP format
    const ipRegex = /^(\d{1,3}\.){3}\d{1,3}$/;
    if (!ipRegex.test(ip)) {
      apiRes.validationError(res, "Invalid IP address format");
      return;
    }

    // Check if IP is already blocked (if BlockedIP model exists)
    // const existingBlock = await BlockedIP.findOne({ ip, status: 'active' });
    // if (existingBlock) {
    //   apiRes.errorResponse(res, "IP address is already blocked");
    //   return;
    // }

    // ============================================
    // STEP 1: Block in Nginx (Load Balancer Level)
    // ============================================
    try {
      const fs = require('fs').promises;
      const { exec } = require('child_process');
      const { promisify } = require('util');
      const execPromise = promisify(exec);
      
      const nginxConfigPath = '/etc/nginx/conf.d/blocked-ips.conf';
      const blockEntry = `# Blocked: ${reason || 'Manual block'}\ndeny ${ip};\n`;
      
      // Append to nginx config
      await fs.appendFile(nginxConfigPath, blockEntry);
      
      // Test nginx configuration
      await execPromise('sudo nginx -t');
      
      // Reload nginx
      await execPromise('sudo systemctl reload nginx');
      
      console.log(`✓ IP ${ip} blocked in Nginx`);
    } catch (nginxError) {
      console.error('Failed to block in Nginx:', nginxError);
      // Non-critical error, continue
    }

    // ============================================
    // STEP 3: Block in iptables (Firewall Level)
    // ============================================
    if (methods.includes('iptables')) {
      try {
        const { exec } = require('child_process');
        const { promisify } = require('util');
        const execPromise = promisify(exec);
        
        // Add DROP rule
        await execPromise(`sudo iptables -A INPUT -s ${ip} -j DROP`);
        
        // Save iptables rules
        await execPromise('sudo iptables-save | sudo tee /etc/iptables/rules.v4 > /dev/null');
        
        console.log(`✓ IP ${ip} blocked in iptables`);
      } catch (iptablesError) {
        console.error('Failed to block in iptables:', iptablesError);
      }
    }

    // ============================================
    // STEP 4: Save to Database (Optional - if model exists)
    // ============================================
    // const blockedIP = new BlockedIP({
    //   ip,
    //   reason: reason || 'Manual block by administrator',
    //   blockedBy: req.user._id,
    //   blockedAt: new Date(),
    //   expiresAt: duration === 0 ? undefined : new Date(Date.now() + duration * 60 * 60 * 1000),
    //   permanent: duration === 0,
    //   status: 'active',
    //   blockMethods: methods,
    // });
    // await blockedIP.save();

    // ============================================
    // STEP 5: Create Alert for Audit Trail
    // ============================================
    const db = getDB();
    await db('alerts').insert({
      type: 'abnormal_pattern',
      severity: 'critical',
      title: `IP Address Blocked: ${ip}`,
      message: `IP address ${ip} has been manually blocked by admin. Reason: ${reason || 'Not specified'}. Methods: Nginx${methods.includes('iptables') ? ', iptables' : ''}`,
      ip_address: ip,
      status: 1, // 1 = acknowledged
      acknowledged_by_admin_id: Number(req.user._id || req.user.id),
      acknowledged_at: db.fn.now(),
      created_at: db.fn.now(),
      updated_at: db.fn.now()
    });

    // ============================================
    // STEP 6: Log the action
    // ============================================
    console.log(`[IP BLOCKED] ${ip} by admin ${req.user._id}. Reason: ${reason}`);

    // ============================================
    // STEP 7: Return success response
    // ============================================
    apiRes.successResponseWithData(res, "IP address blocked successfully", { 
      ip, 
      reason,
      permanent: duration === 0,
      expiresAt: duration === 0 ? null : new Date(Date.now() + duration * 60 * 60 * 1000),
      blockedAt: new Date(),
      methods: ['nginx', ...(methods.includes('iptables') ? ['iptables'] : [])],
    });
  } catch (error: any) {
    log(error.message);
    apiRes.errorResponse(res, ERROR.SomethingWrong);
    return;
  }
};

// ============================================
// UNBLOCK IP ADDRESS
// ============================================
export const unblockIP = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { ip, reason } = req.body;

    if (!ip) {
      apiRes.validationError(res, "IP address is required");
      return;
    }

    if (!req.user?._id) {
      apiRes.errorResponse(res, "Unauthorized");
      return;
    }

    // Validate IP format
    const ipRegex = /^(\d{1,3}\.){3}\d{1,3}$/;
    if (!ipRegex.test(ip)) {
      apiRes.validationError(res, "Invalid IP address format");
      return;
    }

    // ============================================
    // STEP 1: Unblock from Nginx
    // ============================================
    try {
      const fs = require('fs').promises;
      const { exec } = require('child_process');
      const { promisify } = require('util');
      const execPromise = promisify(exec);
      
      const nginxConfigPath = '/etc/nginx/conf.d/blocked-ips.conf';
      
      // Read config file
      let config = await fs.readFile(nginxConfigPath, 'utf-8');
      
      // Remove IP block (including comment line)
      const lines = config.split('\n');
      const filteredLines: string[] = [];
      
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        
        if (line.includes(`deny ${ip};`)) {
          // Check if previous line was a comment
          if (i > 0 && filteredLines[filteredLines.length - 1].startsWith('#')) {
            filteredLines.pop(); // Remove comment
          }
          continue; // Skip deny line
        }
        
        filteredLines.push(line);
      }
      
      // Write updated config
      await fs.writeFile(nginxConfigPath, filteredLines.join('\n'));
      
      // Test and reload
      await execPromise('sudo nginx -t');
      await execPromise('sudo systemctl reload nginx');
      
      console.log(`✓ IP ${ip} unblocked from Nginx`);
    } catch (nginxError) {
      console.error('Failed to unblock from Nginx:', nginxError);
    }

    // ============================================
    // STEP 3: Unblock from iptables
    // ============================================
    try {
      const { exec } = require('child_process');
      const { promisify } = require('util');
      const execPromise = promisify(exec);
      
      // Remove DROP rule
      await execPromise(`sudo iptables -D INPUT -s ${ip} -j DROP`);
      
      // Save iptables rules
      await execPromise('sudo iptables-save | sudo tee /etc/iptables/rules.v4 > /dev/null');
      
      console.log(`✓ IP ${ip} unblocked from iptables`);
    } catch (iptablesError) {
      // Rule might not exist, that's ok
      console.log(`Note: iptables rule for ${ip} may not have existed`);
    }

    // ============================================
    // STEP 4: Update Database (Optional)
    // ============================================
    // const blockedIP = await BlockedIP.findOne({ ip, status: 'active' });
    // if (blockedIP) {
    //   blockedIP.status = 'unblocked';
    //   blockedIP.unblockedBy = req.user._id;
    //   blockedIP.unblockedAt = new Date();
    //   blockedIP.unblockReason = reason || 'Manual unblock by administrator';
    //   await blockedIP.save();
    // }

    // ============================================
    // STEP 5: Create Alert
    // ============================================
    const db = getDB();
    await db('alerts').insert({
      type: 'system_event',
      severity: 'medium',
      title: `IP Address Unblocked: ${ip}`,
      message: `IP address ${ip} has been unblocked by admin. Reason: ${reason || 'Not specified'}`,
      ip_address: ip,
      status: 2, // 2 = resolved
      resolved_at: db.fn.now(),
      created_at: db.fn.now(),
      updated_at: db.fn.now()
    });

    // ============================================
    // STEP 6: Log the action
    // ============================================
    console.log(`[IP UNBLOCKED] ${ip} by admin ${req.user._id}`);

    // ============================================
    // STEP 7: Return success response
    // ============================================
    apiRes.successResponseWithData(res, "IP address unblocked successfully", {
      ip,
      unblockedAt: new Date(),
      unblockedBy: req.user._id,
      reason: reason || 'Manual unblock by administrator',
    });
  } catch (error: any) {
    log(error.message);
    apiRes.errorResponse(res, ERROR.SomethingWrong);
    return;
  }
};

//Get real-time dashboard data
export const getDashboardData = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const db = getDB();
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    // Get new alerts count
    const newAlertsResult = await db('alerts')
      .where('status', 0) // 0 = new
      .where('created_at', '>=', oneDayAgo)
      .count('* as count')
      .first();
    const newAlertsCount = newAlertsResult ? Number(newAlertsResult.count) : 0;

    // Get critical alerts
    const criticalAlerts = await db('alerts')
      .where('severity', 'critical')
      .whereIn('status', [0, 1]) // 0 = new, 1 = acknowledged
      .orderBy('created_at', 'desc')
      .limit(5);

    // Get recent suspicious activity
    const suspiciousLogsResult = await db('traffic_logs')
      .where('suspicious', true)
      .where('timestamp', '>=', oneHourAgo)
      .count('* as count')
      .first();
    const suspiciousLogs = suspiciousLogsResult ? Number(suspiciousLogsResult.count) : 0;

    // Get traffic stats
    const trafficStats = await AnomalyDetectionService.getTrafficStatistics(3600);

    // Get alert counts by severity
    const alertsBySeverityResult = await db('alerts')
      .whereIn('status', [0, 1]) // 0 = new, 1 = acknowledged
      .select('severity')
      .count('* as count')
      .groupBy('severity');
    const alertsBySeverity = alertsBySeverityResult.map((item: any) => ({
      _id: item.severity,
      count: Number(item.count)
    }));

    // Get active IPs in last hour with details
    const activeIPsResult = await db('traffic_logs')
      .where('timestamp', '>=', oneHourAgo)
      .whereNotNull('ip')
      .select('ip')
      .count('* as request_count')
      .select(db.raw("SUM(CASE WHEN suspicious = true THEN 1 ELSE 0 END) as suspicious_count"))
      .select(db.raw("SUM(CASE WHEN status_code >= 400 THEN 1 ELSE 0 END) as error_count"))
      .max('timestamp as last_seen')
      .groupBy('ip')
      .orderBy('request_count', 'desc')
      .limit(20);
    
    const activeIPs = await Promise.all(
      activeIPsResult.map(async (item: any) => {
        const endpoints = await db('traffic_logs')
          .where('ip', item.ip)
          .where('timestamp', '>=', oneHourAgo)
          .distinct('url')
          .limit(10);
        
        const userAgents = await db('traffic_logs')
          .where('ip', item.ip)
          .where('timestamp', '>=', oneHourAgo)
          .whereNotNull('user_agent')
          .distinct('user_agent')
          .limit(5);

        return {
          _id: item.ip,
          requestCount: Number(item.request_count),
          suspiciousCount: Number(item.suspicious_count || 0),
          errorCount: Number(item.error_count || 0),
          lastSeen: item.last_seen,
          endpoints: endpoints.map((e: any) => e.url),
          userAgents: userAgents.map((ua: any) => ua.user_agent)
        };
      })
    );

    // Get blocked IPs count from alerts (IPs that have been blocked)
    const blockedIPsResult = await db('alerts')
      .where('type', 'abnormal_pattern')
      .where('title', 'like', '%IP Address Blocked%')
      .where('status', 1) // 1 = acknowledged
      .count('* as count')
      .first();
    const blockedIPsCount = blockedIPsResult ? Number(blockedIPsResult.count) : 0;

    // Get unique IPs count from traffic logs
    const uniqueIPsResult = await db('traffic_logs')
      .where('timestamp', '>=', oneHourAgo)
      .whereNotNull('ip')
      .distinct('ip');
    const uniqueIPs = uniqueIPsResult.map((item: any) => item.ip);

    // Log admin IP for security audit
    const adminIP = (req.headers['x-system-ip'] as string) || req.ip || 'unknown';
    const adminId = req.user?._id || req.user?.id;
    console.log(`[DASHBOARD ACCESS] Admin ${adminId} accessed dashboard from IP: ${adminIP}`);

    apiRes.successResponseWithData(res, SUCCESS.dataFound, {
      newAlertsCount,
      criticalAlerts,
      suspiciousLogsCount: suspiciousLogs,
      trafficStats,
      alertsBySeverity,
      activeIPs,
      blockedIPsCount,
      uniqueIPsCount: uniqueIPs.length,
      lastUpdated: new Date()
    });
  } catch (error: any) {
    log(error.message);
    apiRes.errorResponse(res, ERROR.SomethingWrong);
    return;
  }
};

// Get detailed IP information
export const getIPDetails = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const db = getDB();
    const { ip } = req.params;
    const { days = 7 } = req.query;
    const startDate = new Date(Date.now() - Number(days) * 24 * 60 * 60 * 1000);

    // Get all logs for this IP
    const logs = await db('traffic_logs')
      .where('ip', ip)
      .where('timestamp', '>=', startDate)
      .orderBy('timestamp', 'desc')
      .limit(100);

    // Get statistics
    const statsResult = await db('traffic_logs')
      .where('ip', ip)
      .where('timestamp', '>=', startDate)
      .select(
        db.raw('COUNT(*) as total_requests'),
        db.raw('SUM(CASE WHEN suspicious = true THEN 1 ELSE 0 END) as suspicious_requests'),
        db.raw('SUM(CASE WHEN status_code >= 400 THEN 1 ELSE 0 END) as error_requests'),
        db.raw('AVG(response_time) as avg_response_time'),
        db.raw('MIN(timestamp) as first_seen'),
        db.raw('MAX(timestamp) as last_seen')
      )
      .first();

    // Get distinct endpoints, methods, and user agents
    const endpointsResult = await db('traffic_logs')
      .where('ip', ip)
      .where('timestamp', '>=', startDate)
      .distinct('url');
    const endpoints = endpointsResult.map((e: any) => e.url);

    const methodsResult = await db('traffic_logs')
      .where('ip', ip)
      .where('timestamp', '>=', startDate)
      .distinct('method');
    const methods = methodsResult.map((m: any) => m.method);

    const userAgentsResult = await db('traffic_logs')
      .where('ip', ip)
      .where('timestamp', '>=', startDate)
      .whereNotNull('user_agent')
      .distinct('user_agent');
    const userAgents = userAgentsResult.map((ua: any) => ua.user_agent);

    const stats = statsResult ? {
      _id: null,
      totalRequests: Number(statsResult.total_requests || 0),
      suspiciousRequests: Number(statsResult.suspicious_requests || 0),
      errorRequests: Number(statsResult.error_requests || 0),
      avgResponseTime: Number(statsResult.avg_response_time || 0),
      endpoints,
      methods,
      userAgents,
      firstSeen: statsResult.first_seen,
      lastSeen: statsResult.last_seen
    } : null;

    // Check if IP is blocked (from alerts)
    const blockedAlert = await db('alerts')
      .where('ip_address', ip)
      .where('type', 'abnormal_pattern')
      .where('title', 'like', '%IP Address Blocked%')
      .where('status', 1) // 1 = acknowledged
      .orderBy('created_at', 'desc')
      .first();
    const isBlocked = !!blockedAlert;
    const blockInfo = blockedAlert ? {
      ip: blockedAlert.ip_address,
      reason: blockedAlert.message,
      blockedAt: blockedAlert.created_at
    } : null;

    // Get related alerts
    const alerts = await db('alerts')
      .where('ip_address', ip)
      .where('created_at', '>=', startDate)
      .orderBy('created_at', 'desc');

    apiRes.successResponseWithData(res, SUCCESS.dataFound, {
      ip,
      stats,
      isBlocked,
      blockInfo,
      recentLogs: logs,
      alerts
    });
  } catch (error: any) {
    log(error.message);
    apiRes.errorResponse(res, ERROR.SomethingWrong);
    return;
  }
};

// Get list of blocked IPs
export const getBlockedIPs = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const db = getDB();
    
    // Get all blocked IPs from alerts
    const blockedIPs = await db('alerts')
      .where('type', 'abnormal_pattern')
      .where('title', 'like', '%IP Address Blocked%')
      .where('status', 1) // 1 = acknowledged
      .orderBy('created_at', 'desc');
    
    // Get unique IPs and their details
    const uniqueIPs = new Map();
    blockedIPs.forEach((alert: any) => {
      if (alert.ip_address && !uniqueIPs.has(alert.ip_address)) {
        uniqueIPs.set(alert.ip_address, alert);
      }
    });
    
    // Get details for each blocked IP
    const blockedIPDetails = await Promise.all(
      Array.from(uniqueIPs.values()).map(async (alert: any) => {
        try {
          // Get request count for this IP (how many times it tried to access)
          const attemptsResult = await db('traffic_logs')
            .where('ip', alert.ip_address)
            .where('timestamp', '>=', new Date(alert.created_at || Date.now()))
            .count('* as count')
            .first();
          const attempts = attemptsResult ? Number(attemptsResult.count) : 0;
          
          return {
            ip: alert.ip_address,
            reason: alert.message,
            blockedAt: alert.created_at,
            attemptsSinceBlocked: attempts
          };
        } catch (error: any) {
          return { ip: alert.ip_address, error: 'Failed to load details' };
        }
      })
    );

    apiRes.successResponseWithData(res, SUCCESS.dataFound, {
      blockedIPs: blockedIPDetails,
      total: blockedIPDetails.length
    });
  } catch (error: any) {
    log(error.message);
    apiRes.errorResponse(res, ERROR.SomethingWrong);
    return;
  }
};
