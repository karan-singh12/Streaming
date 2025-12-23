import { Request, Response } from "express";
import { getDB } from "../../../config/db.config";
import * as apiRes from "../../../utils/apiResponse";
import { WALLET, USER, MEMBERSHIP, ERROR } from "../../../utils/responseMssg";
import { ccbillService } from "../../../services/payment/ccbill.service";

export const initiateCreditPayment = async (req: Request, res: Response) => {
    try {
        const db = getDB();
        const userId = (req as any).user?.id || (req as any).user?._id;
        const { credits, amount } = req.body;

        if (!userId) {
            apiRes.errorResponse(res, USER.accountNotExists);
            return;
        }

        if (!credits || !amount) {
            apiRes.errorResponse(res, WALLET.invalidAmount);
            return;
        }

        const [purchase] = await db("credit_purchases").insert({
            user_id: userId,
            credits_purchased: credits,
            amount_usd: amount,
            final_amount_usd: amount,
            payment_method: "ccbill",
            payment_status: "pending",
            purchase_date: new Date()
        }).returning(["id"]);

        const paymentUrl = ccbillService.generatePaymentUrl(userId, 'credit', amount, purchase.id);

        apiRes.successResponseWithData(res, "Payment initiated successfully", { paymentUrl });

    } catch (error: any) {
        console.error(error.message);
        apiRes.errorResponse(res, ERROR.SomethingWrong);
    }
};

export const handleWebhook = async (req: Request, res: Response) => {
    try {
        const data = req.body || req.query;

        if (!ccbillService.verifySignature(data)) {
            console.error("CCBill Validate Failed");
            res.status(400).send("Validation Failed");
            return;
        }

        if (data.denialId) {
            console.log("Payment Denied: ", data);
            const refId = data.merch_ref_id;
            if (refId) {
                const db = getDB();
                await db("credit_purchases").where("id", refId).update({ payment_status: 'failed' });
            }
            res.status(200).send("OK");
            return;
        }

        const type = data.merch_type;
        const refId = parseInt(data.merch_ref_id);
        const userId = parseInt(data.merch_user_id);
        const subscriptionId = data.subscription_id;

        const db = getDB();

        if (type === 'credit') {
            const trx = await db.transaction();
            try {
                const [purchase] = await trx("credit_purchases")
                    .where("id", refId)
                    .update({
                        payment_status: 'completed',
                        payment_gateway_ref: subscriptionId
                    })
                    .returning("*");

                if (purchase) {
                    let wallet = await trx("credit_wallets").where("user_id", userId).first();
                    if (!wallet) {
                        [wallet] = await trx("credit_wallets").insert({
                            user_id: userId,
                            balance: 0,
                            frozen_credits: 0,
                            total_spent: 0
                        }).returning("*");
                    }

                    const newBalance = parseFloat(wallet.balance) + parseFloat(purchase.credits_purchased);

                    await trx("credit_wallets").where("id", wallet.id).update({
                        balance: newBalance,
                        updated_at: new Date()
                    });

                    await trx("credit_transactions").insert({
                        wallet_id: wallet.id,
                        transaction_type: "credit_purchase",
                        amount: purchase.credits_purchased,
                        balance_after: newBalance,
                        description: `Purchased credits via CCBill`,
                        related_payment_id: purchase.id,
                        source: "purchase",
                        transaction_date: new Date()
                    });
                }

                await trx.commit();
            } catch (err) {
                await trx.rollback();
                console.error("Webhook Tx Error", err);
            }
        }

        res.status(200).send("Success");

    } catch (error: any) {
        console.error("Webhook Error:", error.message);
        res.status(500).send("Server Error");
    }
};