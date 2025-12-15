import { Router } from "express";
import authRoutes from "./auth.route";
import cmsRoutes from "./cms.route";
import emailTemplateRoutes from "./email.route";
import faqRoutes from "./faq.route";
import userRoutes from "./user.route";
import streamerRoutes from './streamer.route';
import membershipRoute from './memberships.routes';
import securityRoutes from './security.route';
import roomRoutes from './room.route';

const adminRouter = Router();

adminRouter.use("/auth", authRoutes);

adminRouter.use("/cms", cmsRoutes);

adminRouter.use("/security", securityRoutes);

adminRouter.use("/emailTemplate", emailTemplateRoutes);

adminRouter.use("/faq", faqRoutes);

adminRouter.use("/user", userRoutes);

adminRouter.use('/streamer', streamerRoutes);

adminRouter.use('/membership', membershipRoute);

adminRouter.use('/room', roomRoutes);

export default adminRouter;