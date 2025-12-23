import { Router } from "express";
import { getWalletBalance, purchaseCredits } from "../../controllers/user/credit-wallet-api/creditWallet.controller";
import auth from "../../middleware/auth.middleware";

const router = Router();

router.get("/wallet/balance", auth as any, getWalletBalance as any);

router.post("/wallet/purchase", auth as any, purchaseCredits as any);

export default router;