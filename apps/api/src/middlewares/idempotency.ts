import type { RequestHandler } from "express";
import { createHash } from "node:crypto";
import { AppError } from "../shared/AppError";
import { getCollection, type BaseCollection } from "../db/mongo";

export interface IdempotencyRecord {
  key: string;
  fingerprint: string;
  status: "in_progress" | "completed";
  response_status?: number;
  response_body?: any;
  created_at: string;
}

export interface IdempotencyOptions {
  required?: boolean;
}

export function idempotency(options: IdempotencyOptions = {}): RequestHandler {
  const isRequired = options.required ?? false;

  return async (req, res, next) => {
    const key = req.header("Idempotency-Key");

    if (!key) {
      if (isRequired) {
        return next(new AppError(400, "MISSING_IDEMPOTENCY_KEY", "Idempotency-Key header is required for this operation"));
      }
      return next();
    }

    try {
      const coll = await getCollection<IdempotencyRecord>("idempotency");
      const bodyStr = req.body ? JSON.stringify(req.body) : "";
      const fingerprint = createHash("sha256")
        .update(`${req.method}:${req.path}:${bodyStr}`)
        .digest("hex");

      const existing = await coll.findOne({ key });

      if (existing) {
        if (existing.fingerprint !== fingerprint) {
          return next(
            new AppError(
              422,
              "IDEMPOTENCY_MISMATCH",
              "Idempotency key has already been used with a different request payload"
            )
          );
        }

        if (existing.status === "in_progress") {
          return next(
            new AppError(
              409,
              "IDEMPOTENCY_IN_PROGRESS",
              "A request with this idempotency key is currently processing. Retry shortly."
            )
          );
        }

        if (existing.status === "completed" && existing.response_status) {
          res.setHeader("Idempotent-Replay", "true");
          res.status(existing.response_status).json(existing.response_body);
          return;
        }
      }

      // Mark in progress
      await coll.insertOne({
        key,
        fingerprint,
        status: "in_progress",
        created_at: new Date().toISOString(),
      });

      // Intercept res.json / res.send to save response
      const originalJson = res.json.bind(res);
      res.json = ((body: any) => {
        // Record completed
        coll.updateOne(
          { key },
          {
            $set: {
              status: "completed",
              response_status: res.statusCode,
              response_body: body,
            },
          }
        ).catch(() => {});
        return originalJson(body);
      }) as any;

      next();
    } catch (err) {
      next(err);
    }
  };
}
