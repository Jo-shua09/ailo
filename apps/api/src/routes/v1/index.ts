import { Router } from "express";
import health from "../../modules/health/health.routes";

// Each module exports a router; mount it here.
const v1 = Router();
v1.use(health);

export default v1;
