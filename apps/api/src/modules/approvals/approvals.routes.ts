import { Router } from "express";
import { validate } from "../../middlewares/validate";
import { ApprovalDecisionInput } from "./approvals.dto";
import { approvalsService } from "./approvals.service";

const router = Router();

router.get("/approvals", async (_req, res, next) => {
  try {
    const pending = await approvalsService.listPending();
    res.json({ approvals: pending });
  } catch (err) {
    next(err);
  }
});

router.get("/approvals/:id", async (req, res, next) => {
  try {
    const approval = await approvalsService.getApproval(req.params.id as string);
    res.json(approval);
  } catch (err) {
    next(err);
  }
});

router.post("/approvals/:id", validate({ body: ApprovalDecisionInput }), async (req, res, next) => {
  try {
    const { decision } = req.body as ApprovalDecisionInput;
    const result = await approvalsService.decide(req.params.id as string, decision);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

export default router;
