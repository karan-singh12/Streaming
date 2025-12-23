import { Request, Response } from "express";
import { getDB } from "../../../config/db.config";
import * as apiRes from "../../../utils/apiResponse";
import { WALLET, USER, ERROR } from "../../../utils/responseMssg";

// for get available wallet balance
export const getWalletBalance = async (req: Request, res: Response) => {
    try {
        const db = getDB();
        const userId = (req as any).user?.id || (req as any).user?._id;

        if (!userId) {
            apiRes.errorResponse(res, USER.accountNotExists);
            return;
        }

        const wallet = await db("credit_wallets").where("user_id", userId).first();

        apiRes.successResponse(res, WALLET.walletBalanceRetrievedSuccessfully, {
            balance: wallet ? parseFloat(wallet.balance) : 0,
            frozen_credits: wallet ? parseFloat(wallet.frozen_credits) : 0
        });
    } catch (error: any) {
        console.error(error.message);
        apiRes.errorResponse(res, error.message);
        return;
    }
};

// for purchase credits into wallet
export const purchaseCredits = async (req: Request, res: Response) => {
    const db = getDB();
    const trx = await db.transaction();

    try {
        const userId = (req as any).user?.id || (req as any).user?._id;
        const { credits, amount, paymentMethod } = req.body;

        if (!userId) {
            await trx.rollback();
            apiRes.errorResponse(res, USER.accountNotExists);
            return;
        }
        if (!credits || credits <= 0) {
            await trx.rollback();
            apiRes.errorResponse(res, WALLET.invalidAmount);
            return;
        }

        // 1. Record Purchase
        const [purchase] = await trx("credit_purchases").insert({
            user_id: userId,
            credits_purchased: credits,
            amount_usd: amount || 0,
            final_amount_usd: amount || 0,
            payment_method: paymentMethod || "mock_cc",
            payment_status: "completed",
            purchase_date: new Date()
        }).returning(["id"]);

        // 2. Get or Create Wallet
        let wallet = await trx("credit_wallets").where("user_id", userId).first();
        if (!wallet) {
            [wallet] = await trx("credit_wallets").insert({
                user_id: userId,
                balance: 0,
                frozen_credits: 0,
                total_spent: 0
            }).returning("*");
        }

        // 3. Update Wallet Balance
        const newBalance = parseFloat(wallet.balance) + parseFloat(credits);
        const [updatedWallet] = await trx("credit_wallets")
            .where("id", wallet.id)
            .update({
                balance: newBalance,
                updated_at: new Date()
            })
            .returning("*");

        // 4. Record Transaction
        await trx("credit_transactions").insert({
            wallet_id: wallet.id,
            transaction_type: "credit_purchase",
            amount: credits,
            balance_after: newBalance,
            description: `Purchased ${credits} credits`,
            related_payment_id: purchase.id,
            source: "purchase",
            transaction_date: new Date()
        });

        await trx.commit();

        return apiRes.successResponse(res, "Credits purchased successfully", {
            new_balance: newBalance,
            credits_added: credits
        });

    } catch (error: any) {
        await trx.rollback();
        console.error("Purchase Credits Error:", error);
        return apiRes.errorResponse(res, error.message || "Failed to purchase credits");
    }
};

// for wallect transactions
export const getWalletTransactions = async (req: Request, res: Response) => {
    try {
        const db = getDB();
        const userId = (req as any).user?.id || (req as any).user?._id;

        if (!userId) {
            apiRes.errorResponse(res, USER.accountNotExists)
            return;
        }

        const transactions = await db("credit_transactions")
            .where("wallet_id", userId)
            .orderBy("transaction_date", "desc");

        apiRes.successResponse(res, WALLET.walletTransactionsRetrievedSuccessfully, transactions);
    } catch (error: any) {
        console.error(error.message)
        apiRes.errorResponse(res, ERROR.SomethingWrong)
        return;
    }
};