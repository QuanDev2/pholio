import jwt from "jsonwebtoken";

export function signAccessToken(userId: string) {
  const SECRET = process.env.JWT_SECRET;
  if (!SECRET) {
    throw new Error("JWT_SECRET is not set");
  }

  return jwt.sign({ userId }, SECRET, { expiresIn: "15m" });
}
