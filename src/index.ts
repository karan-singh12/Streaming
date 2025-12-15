import http from "http";
import app from "./app";
import { initializeSocket } from "./socket/streamer.scoket";
import { startCleanupJob } from "./jobs/cleanup.job";

const PORT = process.env.API_PORT || 3000;

const server = http.createServer(app);

const io = initializeSocket(server);

(global as any).io = io;

// Start cleanup job
startCleanupJob();

// Start server
server.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});