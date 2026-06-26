import jwt from "jsonwebtoken";

export function getJwtSecret() {
  const SECRET = process.env.JWT_SECRET;
  if (!SECRET) {
    throw new Error("JWT_SECRET is not set");
  }
  return SECRET;
}

export function signAccessToken(userId: string) {
  return jwt.sign({ userId }, getJwtSecret(), { expiresIn: "15m" });
}
