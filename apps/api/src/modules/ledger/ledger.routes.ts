import { Router } from "express";
import { validate } from "../../middlewares/validate";
import { TopUpInput } from "./ledger.dto";
import { ledgerService } from "./ledger.service";

const router = Router();

router.get("/ledger/balances", async (_req, res, next) => {
  try {
    const balances = await ledgerService.getBalances();
    res.json(balances);
  } catch (err) {
    next(err);
  }
});

router.post("/ledger/topup", validate({ body: TopUpInput }), async (req, res, next) => {
  try {
    const { amount_kobo, description } = req.body as TopUpInput;
    const balances = await ledgerService.topUpOwnerWallet(amount_kobo, description);
    res.json({ status: "success", balances });
  } catch (err) {
    next(err);
  }
});

export default router;
