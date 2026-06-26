import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { getJwtSecret } from "../lib/jwt";

export function authenticate(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  const token = header?.split(" ")[1];

  if (!token) {
    return res.status(401).json({ error: "Invalid credentials" });
  }

  const SECRET = getJwtSecret();

  try {
    const payload = jwt.verify(token, SECRET) as { userId: string };
    req.user = { id: payload.userId };
    next();
  } catch (err) {
    if (err instanceof jwt.TokenExpiredError) {
      // valid token but expired after 15 min -> refresh
      return res.status(401).json({ error: "Invalid credentials" });
    }
    if (err instanceof jwt.JsonWebTokenError) {
      // tampered
      return res.status(401).json({ error: "Invalid credentials" });
    }
    // anything else that slips past the two cases above
    return res.status(401).json({ error: "Invalid credentials" });
  }
}
