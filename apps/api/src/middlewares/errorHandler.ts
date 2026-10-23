import type { ErrorRequestHandler } from "express";
import { AppError } from "../shared/AppError";

export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  if (err instanceof AppError) {
    res.status(err.status).json({ error: { code: err.code, message: err.message, details: err.details } });
    return;
  }
  console.error(err);
  // Never leak internals (Kora responses, stack traces) to clients.
  res.status(500).json({ error: { code: "INTERNAL", message: "Something went wrong" } });
};
