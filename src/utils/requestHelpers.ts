import { Request } from "express";

/**
 * Get client IP address from request
 */
export function getClientIp(req: Request): string {
    return (
        (req.headers["x-forwarded-for"] as string)?.split(",")[0] ||
        (req.headers["x-real-ip"] as string) ||
        req.socket.remoteAddress ||
        req.ip ||
        "unknown"
    );
}

/**
 * Get user agent from request
 */
export function getUserAgent(req: Request): string {
    return req.headers["user-agent"] || "unknown";
}

