import { Router } from "express";
import authRoutes from "./auth.route";
import homeRoutes from "./home.route";

const userRouter = Router();

userRouter.use("/auth", authRoutes);
userRouter.use("/home", homeRoutes);

export default userRouter;