import type { Request, Response, NextFunction } from "express";
import { ZodError } from "zod";

// A normal Error, optionally carrying an HTTP status (e.g. 404).
export interface HttpError extends Error {
  status?: number;
}

// The error lane. FOUR args (err first) is how Express recognizes it.
// Registered LAST in app.ts so any next(err) upstream falls through to here.
export function errorHandler(err: HttpError, _req: Request, res: Response, _next: NextFunction) {
  console.error(err);

  if (err instanceof ZodError) {
    return res.status(400).json({
      error: "Schema validation failed",
      details: err.issues.map((issue) => ({
        field: issue.path.join("."), // ['photos', 0, 'caption'] → "photos.0.caption"
        message: issue.message,
      })),
    });
  }

  res.status(err.status ?? 500).json({ error: err.message || "Internal Server Error" });
}
