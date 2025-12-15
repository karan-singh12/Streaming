import { Router } from "express";
import authRoutes from "./auth.route";
import streamRoutes from "./stream.route";

const streamerRouter = Router();

streamerRouter.use("/auth", authRoutes);

streamerRouter.use("/stream", streamRoutes);

export default streamerRouter;