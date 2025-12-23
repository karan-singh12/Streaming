import { Router } from "express";
import { getPlans, upgradeMembership } from "../../controllers/user/membership-api/membership.controller";
import auth from "../../middleware/auth.middleware";

const router = Router();

router.post("/membership/upgrade", auth as any, upgradeMembership as any);

export default router;
