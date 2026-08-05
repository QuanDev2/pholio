import type { Request, Response, NextFunction } from "express";
import { ZodError } from "zod";

// A normal Error, optionally carrying an HTTP status (e.g. 404).
export interface HttpError extends Error {
  status?: number;
}

// An error we threw on purpose — a known, "operational" failure (bad input,
// missing resource, forbidden) whose `message` is safe to show the client.
// The handler trusts an AppError's message; any OTHER error is treated as an
// unexpected bug and answered with an opaque 500 (detail goes to the logs only).
export class AppError extends Error {
  readonly isOperational = true;

  constructor(
    public status: number,
    message: string,
    public details?: unknown,
  ) {
    super(message);
    this.name = "AppError";
  }
}

// The error lane. FOUR args (err first) is how Express recognizes it.
// Registered LAST in app.ts so any next(err) upstream falls through to here.
export function errorHandler(err: HttpError, _req: Request, res: Response, _next: NextFunction) {
  console.error(err); // full detail ALWAYS goes to the server logs

  // Bad request body — 400 with the field-level issues (safe to expose).
  if (err instanceof ZodError) {
    return res.status(400).json({
      error: "Schema validation failed",
      details: err.issues.map((issue) => ({
        field: issue.path.join("."), // ['photos', 0, 'caption'] → "photos.0.caption"
        message: issue.message,
      })),
    });
  }

  // Errors we threw on purpose — the message is curated, so send it.
  if (err instanceof AppError) {
    return res.status(err.status).json({ error: err.message, details: err.details });
  }

  // Anything else is an unexpected bug. Never leak its message (could carry a
  // stack, SQL, or file path) — answer opaque; the detail is in the logs above.
  res.status(500).json({ error: "Internal Server Error" });
}
