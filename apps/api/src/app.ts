import express from "express";
import { errorHandler } from "./middlewares/errorHandler";
import { notFound } from "./middlewares/notFound";
import v1 from "./routes/v1";

export function createApp() {
  const app = express();
  // The Kora webhook route must read the raw body for signature checks: mount it BEFORE express.json().
  app.use(express.json({ limit: "100kb" }));
  app.use("/v1", v1);
  app.use(notFound);
  app.use(errorHandler);
  return app;
}
