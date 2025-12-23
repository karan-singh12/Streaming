import { Router } from "express";
import { initiateCreditPayment, handleWebhook } from "../../controllers/user/payment-api/ccbill.controller";
import auth from "../../middleware/auth.middleware";

const router = Router();

// Initiate CCBill Payment (Protected)
router.post("/ccbill/initiate", auth as any, initiateCreditPayment as any);

// CCBill Webhook (Public, Postback)
router.post("/webhook/ccbill", handleWebhook as any);

// Fallback GET for webhooks if configured that way (some send GET)
router.get("/webhook/ccbill", handleWebhook as any);

export default router;
