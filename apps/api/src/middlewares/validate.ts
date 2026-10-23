import type { RequestHandler } from "express";
import type { ZodType } from "zod";
import { AppError } from "../shared/AppError";

/** Validates req.body at the trust boundary and replaces it with the parsed value. */
export function validate(schemas: { body?: ZodType }): RequestHandler {
  return (req, _res, next) => {
    if (schemas.body) {
      const parsed = schemas.body.safeParse(req.body);
      if (!parsed.success) {
        next(new AppError(400, "VALIDATION_FAILED", "Request body is invalid", parsed.error.issues));
        return;
      }
      req.body = parsed.data;
    }
    next();
  };
}
