import jwt, { JwtPayload } from "jsonwebtoken";
import { Socket } from "socket.io";
import { ExtendedError } from "socket.io/dist/namespace";
import { getDB } from "../config/db.config";

interface DecodedToken extends JwtPayload {
    _id: string;
    role?: string;
}

interface AuthenticatedSocket extends Socket {
    user?: any;
    role?: string;
}

export const verifySocketToken = async (
    socket: AuthenticatedSocket,
    next: (err?: ExtendedError) => void
): Promise<void> => {
    try {
        const token = socket.handshake.auth?.token || socket.handshake.query?.token;

        if (!token || typeof token !== "string") {
            return next(new Error("Authentication error: Token required"));
        }

        // Determine which secret key to use based on token or try both
        // For socket connections, we'll try user token first, then admin
        let decoded: DecodedToken | null = null;
        let userType: "admin" | "user" = "user";

        // Try user token first
        const userTokenKey = process.env.TOKEN_SECRET_KEY_2;
        if (userTokenKey) {
            try {
                const verified = jwt.verify(token, userTokenKey);
                decoded = verified as unknown as DecodedToken;
                userType = "user";
            } catch (err) {
                // Continue to try admin token
            }
        }

        // Try admin token if user token failed
        if (!decoded) {
            const adminTokenKey = process.env.TOKEN_SECRET_KEY_1;
            if (adminTokenKey) {
                try {
                    const verified = jwt.verify(token, adminTokenKey);
                    decoded = verified as unknown as DecodedToken;
                    userType = "admin";
                } catch (adminErr) {
                    return next(new Error("Authentication error: Invalid token"));
                }
            } else {
                return next(new Error("Authentication error: Token secret keys not configured"));
            }
        }

        if (!decoded || !decoded._id) {
            return next(new Error("Authentication error: Invalid token payload"));
        }

        const db = getDB();
        const userId = decoded._id;

        let user: any = null;

        if (userType === "admin") {
            user = await db("admins")
                .where("id", userId)
                .where("status", "!=", 2) // Not deleted
                .select("*")
                .first();
        } else {
            // Users table uses integer IDs
            const userIdInt = parseInt(userId);
            if (isNaN(userIdInt)) {
                return next(new Error("Authentication error: Invalid user ID format"));
            }
            user = await db("users")
                .where("id", userIdInt)
                .where("status", "!=", 2) // Not deleted
                .select("*")
                .first();
        }

        if (!user) {
            return next(new Error("Authentication error: User not found"));
        }

        // Remove sensitive fields
        if (user.password) {
            delete user.password;
        }

        // Attach to socket
        socket.user = user;
        socket.role = userType;

        next();
    } catch (error: any) {
        console.error("Socket Auth Error:", error.message);
        return next(new Error("Authentication error: Invalid token"));
    }
};
