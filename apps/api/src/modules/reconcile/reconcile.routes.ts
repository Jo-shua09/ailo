import { Router } from "express";
import { reconcileService } from "./reconcile.service";

const router = Router();

router.post("/ops/reconcile", async (_req, res, next) => {
  try {
    const result = await reconcileService.squareUp();
    res.json(result);
  } catch (err) {
    next(err);
  }
});

export default router;
