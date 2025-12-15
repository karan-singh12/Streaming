import express, { Application } from "express";
import routes from "./routes";
import swaggerRoutes from "./routes/swagger.route";
import { trafficMonitorMiddleware } from "./middleware/trafficMonitor.middleware";
import connectDB from "./config/db.config";
import dotenv from "dotenv";
import cors from "cors";
import morgan from "morgan";
import bodyParser from "body-parser"; 

dotenv.config();

const app: Application = express();

// Middleware
app.use(bodyParser.json({ limit: "100mb" })); 
app.use(bodyParser.urlencoded({ limit: "100mb", extended: true })); 
app.use(express.json({ limit: "100mb" })); 
app.use(express.urlencoded({ limit: "100mb", extended: true }));

app.use("/public", express.static("public"));
app.use(morgan("dev"));
app.use(cors());
app.use(express.urlencoded({ extended: true }));

// Traffic monitoring middleware (before routes)
app.use(trafficMonitorMiddleware);

// Initialize database connection
connectDB().catch((error) => {
  console.error("Failed to initialize database:", error);
  process.exit(1);
});

// Swagger documentation routes (before API routes)
app.use("/api", swaggerRoutes);

// API routes
app.use("/api", routes);

export default app;
