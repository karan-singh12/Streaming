import { Server as HTTPServer } from "http";
import { Server as SocketIOServer, Socket } from "socket.io";
import { verifySocketToken } from "../middleware/socketAuth.middleware";

interface AuthenticatedSocket extends Socket {
    user?: any;
    role?: string;
}

export const initializeSocket = (server: HTTPServer): SocketIOServer => {
    const io = new SocketIOServer(server, {
        cors: {
            origin: process.env.CORS_ORIGIN?.split(",") || "*",
            methods: ["GET", "POST"],
            credentials: true,
        },
        transports: ["websocket", "polling"],
    });

    // Apply authentication middleware
    io.use(verifySocketToken);

    io.on("connection", (socket: AuthenticatedSocket) => {
        if (!socket.user) {
            socket.disconnect();
            return;
        }

        const userId = socket.user.id || socket.user._id;
        const userRole = socket.role || "user";

        console.log(`User ${userId} (${userRole}) connected via socket`);

        // Join user-specific room
        socket.join(`user:${userId}`);

        // Join role-specific room
        socket.join(`role:${userRole}`);

        // Handle disconnection
        socket.on("disconnect", (reason) => {
            console.log(`User ${userId} (${userRole}) disconnected: ${reason}`);
        });

        // Handle errors
        socket.on("error", (error) => {
            console.error(`Socket error for user ${userId}:`, error);
        });
    });

    return io;
};