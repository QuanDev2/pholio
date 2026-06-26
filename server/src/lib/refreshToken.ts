import crypto from "crypto";
import { prisma } from "./prisma";
import type { Response } from "express";

export async function issueRefreshToken(userId: string) {
  const token = crypto.randomBytes(40).toString("hex");
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  await prisma.refreshToken.create({ data: { token, userId, expiresAt } });
  return token;
}

export function setRefreshCookie(res: Response, token: string) {
  res.cookie("refreshToken", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: 30 * 24 * 60 * 60 * 1000,
  });
}
