import { Request, Response, NextFunction } from "express";
import { getDB } from "../config/db.config";
import { AnomalyDetectionService } from "../services/anomalyDetection.service";
import { AuthenticatedRequest } from "../types/auth.types";

// Rate limiting tracking using in-memory map (for quick access)
const requestCounts = new Map<string, { count: number; firstRequest: number }>();

// Configuration for suspicious activity detection
const SUSPICIOUS_PATTERNS = {
  SQL_INJECTION: /(\bUNION\b|\bSELECT\b|\bINSERT\b|\bUPDATE\b|\bDELETE\b|\bDROP\b|\bCREATE\b|\bALTER\b|--|;|'|")/gi,
  XSS_ATTEMPT: /(<script|<iframe|<object|<embed|javascript:|onerror=|onload=)/gi,
  PATH_TRAVERSAL: /(\.\.\/)|(\.\.\\)/g,
  COMMAND_INJECTION: /(\||&|;|\$\(|\`)/g
};

export const trafficMonitorMiddleware = async (
  req: Request | AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  const startTime = Date.now();
  // Get IP from frontend header (x-system-ip) or fallback to req.ip
  const ip = (req.headers['x-system-ip'] as string) || req.ip || req.connection.remoteAddress || 'unknown';
  
  // Get user info if authenticated
  const authenticatedReq = req as AuthenticatedRequest;
  const userId = authenticatedReq.user?._id || authenticatedReq.user?.id;
  const userType = authenticatedReq.user?.role || 'guest';

  // Track request count for rate limiting
  const currentTime = Date.now();
  const requestKey = `${ip}:${Math.floor(currentTime / 60000)}`;
  
  const existing = requestCounts.get(requestKey);
  if (existing) {
    existing.count++;
  } else {
    requestCounts.set(requestKey, { count: 1, firstRequest: currentTime });
  }

  for (const [key, value] of requestCounts.entries()) {
    if (currentTime - value.firstRequest > 300000) {
      requestCounts.delete(key);
    }
  }

  const originalSend = res.send;
  const originalJson = res.json;

  let responseBody: any;
  let suspicious = false;
  const suspicionReasons: string[] = [];

  const fullUrl = `${req.protocol}://${req.get('host')}${req.originalUrl}`;
  const urlToCheck = req.originalUrl + JSON.stringify(req.query);
  
  if (SUSPICIOUS_PATTERNS.SQL_INJECTION.test(urlToCheck)) {
    suspicious = true;
    suspicionReasons.push('Potential SQL injection attempt detected in URL');
  }
  
  if (SUSPICIOUS_PATTERNS.XSS_ATTEMPT.test(urlToCheck)) {
    suspicious = true;
    suspicionReasons.push('Potential XSS attempt detected in URL');
  }
  
  if (SUSPICIOUS_PATTERNS.PATH_TRAVERSAL.test(urlToCheck)) {
    suspicious = true;
    suspicionReasons.push('Path traversal attempt detected');
  }

  // Check request body for suspicious patterns
  if (req.body && typeof req.body === 'object') {
    const bodyStr = JSON.stringify(req.body);
    
    if (SUSPICIOUS_PATTERNS.SQL_INJECTION.test(bodyStr)) {
      suspicious = true;
      suspicionReasons.push('Potential SQL injection attempt detected in request body');
    }
    
    if (SUSPICIOUS_PATTERNS.XSS_ATTEMPT.test(bodyStr)) {
      suspicious = true;
      suspicionReasons.push('Potential XSS attempt detected in request body');
    }
    
    if (SUSPICIOUS_PATTERNS.COMMAND_INJECTION.test(bodyStr)) {
      suspicious = true;
      suspicionReasons.push('Potential command injection attempt detected');
    }
  }

  // Check for rapid request rate (potential DDoS or brute force)
  if (existing && existing.count > 60) { // More than 60 requests per minute from same IP
    suspicious = true;
    suspicionReasons.push(`High request rate: ${existing.count} requests per minute`);
  }

  // Check for suspicious user agents
  const userAgent = req.get('user-agent') || '';
  const suspiciousUserAgents = ['curl', 'wget', 'python-requests', 'nikto', 'sqlmap', 'nmap'];
  if (suspiciousUserAgents.some(agent => userAgent.toLowerCase().includes(agent))) {
    suspicious = true;
    suspicionReasons.push(`Suspicious user agent: ${userAgent}`);
  }

  // Override res.send to capture response
  res.send = function (data: any) {
    responseBody = data;
    res.send = originalSend;
    return originalSend.call(this, data);
  };

  // Override res.json to capture response
  res.json = function (data: any) {
    responseBody = data;
    res.json = originalJson;
    return originalJson.call(this, data);
  };

  // Log after response is sent
  res.on('finish', async () => {
    try {
      const responseTime = Date.now() - startTime;
      
      // Check for error responses
      if (res.statusCode >= 400) {
        if (res.statusCode === 401 || res.statusCode === 403) {
          suspicionReasons.push('Unauthorized access attempt');
          suspicious = true;
        } else if (res.statusCode >= 500) {
          suspicionReasons.push('Server error triggered');
        }
      }

      // Create traffic log
      const db = getDB();
      const now = new Date();
      
      // Ensure user_type is valid (admin, user, or guest)
      const validUserType = ['admin', 'user', 'guest'].includes(userType?.toLowerCase()) 
        ? userType.toLowerCase() 
        : 'guest';
      
      // Prepare suspicion_reasons array for PostgreSQL
      const suspicionReasonsArray = suspicionReasons.length > 0 ? suspicionReasons : null;
      
      await db('traffic_logs').insert({
        ip: ip.substring(0, 45), // Ensure IP doesn't exceed 45 chars
        method: req.method.substring(0, 10), // Ensure method doesn't exceed 10 chars
        url: req.originalUrl.substring(0, 10000), // Limit URL length
        status_code: res.statusCode,
        response_time: responseTime,
        user_agent: userAgent ? userAgent.substring(0, 500) : null, // Limit user agent length
        user_id: userId ? String(userId).substring(0, 255) : null,
        user_type: validUserType,
        timestamp: new Date(startTime),
        request_body: shouldLogBody(req.originalUrl) ? sanitizeBody(req.body) : null,
        error_message: res.statusCode >= 400 ? (extractErrorMessage(responseBody)?.substring(0, 1000) || null) : null,
        suspicious,
        suspicion_reasons: suspicionReasonsArray,
        created_at: now,
        updated_at: now
      });

      // Trigger anomaly detection for suspicious activity
      if (suspicious || res.statusCode >= 400) {
        // Run anomaly detection in background (non-blocking)
        AnomalyDetectionService.analyzeTraffic(ip, req.originalUrl).catch(err => {
          console.error('Anomaly detection error:', err);
        });
      }

    } catch (error) {
      console.error('Traffic monitoring error:', error);
    }
  });

  next();
};

/**
 * Determine if request body should be logged
 */
function shouldLogBody(url: string): boolean {
  // Don't log sensitive endpoints
  const sensitiveEndpoints = ['/login', '/password', '/otp', '/reset'];
  return !sensitiveEndpoints.some(endpoint => url.includes(endpoint));
}

/**
 * Sanitize request body to remove sensitive data
 */
function sanitizeBody(body: any): any {
  if (!body) return undefined;
  
  const sanitized = { ...body };
  const sensitiveFields = ['password', 'token', 'secret', 'apiKey', 'creditCard'];
  
  for (const field of sensitiveFields) {
    if (sanitized[field]) {
      sanitized[field] = '***REDACTED***';
    }
  }
  
  return sanitized;
}

/**
 * Extract error message from response body
 */
function extractErrorMessage(responseBody: any): string | undefined {
  if (!responseBody) return undefined;
  
  try {
    const parsed = typeof responseBody === 'string' ? JSON.parse(responseBody) : responseBody;
    return parsed.message || parsed.error || 'Unknown error';
  } catch {
    return 'Unable to parse error message';
  }
}

/**
 * Get current request count for an IP
 */
export function getRequestCount(ip: string): number {
  const currentTime = Date.now();
  const requestKey = `${ip}:${Math.floor(currentTime / 60000)}`;
  return requestCounts.get(requestKey)?.count || 0;
}

/**
 * Clear rate limit tracking for an IP (useful for whitelisting)
 */
export function clearRateLimitTracking(ip: string): void {
  const currentTime = Date.now();
  const requestKey = `${ip}:${Math.floor(currentTime / 60000)}`;
  requestCounts.delete(requestKey);
}

