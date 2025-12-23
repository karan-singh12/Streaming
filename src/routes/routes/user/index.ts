import { Router } from "express";
import authRoutes from "./auth.route";
import homeRoutes from "./home.route";
import membershipRoutes from "./membership.route";
import creditWalletRoutes from "./creditWallet.route";
import paymentRoutes from "./payment.route";

const userRouter = Router();

userRouter.use("/auth", authRoutes);
userRouter.use("/home", homeRoutes);
userRouter.use("/membership", membershipRoutes);
userRouter.use("/credit-wallet", creditWalletRoutes);
userRouter.use("/payment", paymentRoutes);

export default userRouter;