import { Router } from "express";
import { asyncHandler } from "../middleware/asyncHandler";
import { loginSchema, registerSchema } from "../schemas/auth";
import { validate } from "../middleware/validate";
import { prisma } from "../lib/prisma";
import bcrypt from "bcrypt";
import { signAccessToken } from "../lib/jwt";
import { issueRefreshToken, setRefreshCookie } from "../lib/refreshToken";
import { authenticate } from "../middleware/authenticate";
import { AppError } from "../middleware/errorHandler";

const router = Router();

router.post(
  "/register",
  validate(registerSchema),
  asyncHandler(async (req, res) => {
    const { email, username, name, password } = req.body;

    const existingEmail = await prisma.user.findUnique({ where: { email } });
    if (existingEmail) {
      throw new AppError(409, "Email already exists");
    }

    const existingUsername = await prisma.user.findUnique({ where: { username } });
    if (existingUsername) {
      throw new AppError(409, "Username already exists");
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const user = await prisma.user.create({
      data: { email, username, name, password: hashedPassword },
    });

    const token = signAccessToken(user.id);

    const { password: _, ...safeUser } = user;
    const refreshToken = await issueRefreshToken(user.id);
    setRefreshCookie(res, refreshToken);

    return res.status(201).json({ data: safeUser, token });
  }),
);

router.post(
  "/login",
  validate(loginSchema),
  asyncHandler(async (req, res) => {
    const { email, password } = req.body;
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      throw new AppError(401, "Invalid credentials");
    }

    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      throw new AppError(401, "Invalid credentials");
    }

    const { password: _, ...safeUser } = user;
    const token = signAccessToken(user.id);
    const refreshToken = await issueRefreshToken(user.id);

    setRefreshCookie(res, refreshToken);

    return res.status(200).json({ data: safeUser, token });
  }),
);

router.post(
  "/refresh",
  asyncHandler(async (req, res) => {
    const token = req.cookies.refreshToken; // populated by cookie-parser
    if (!token) {
      throw new AppError(401, "Invalid credentials");
    }

    const stored = await prisma.refreshToken.findUnique({ where: { token } });

    // token is old, possibly a theft
    if (!stored) {
      throw new AppError(401, "Invalid credentials");
    }

    // if token is valid but already expired, delete it, force a re-login
    if (stored.expiresAt < new Date()) {
      await prisma.refreshToken.delete({ where: { token } });
      throw new AppError(401, "Invalid credentials");
    }

    // rotating token: delete old + issue new atomically. If issue fails after the
    // delete, the transaction rolls the delete back — the user can't be left with
    // zero valid refresh tokens (both writes commit, or neither does).
    const newRefreshToken = await prisma.$transaction(async (tx) => {
      await tx.refreshToken.delete({ where: { token } });
      return issueRefreshToken(stored.userId, tx);
    });
    setRefreshCookie(res, newRefreshToken);

    const accessToken = signAccessToken(stored.userId);

    return res.status(200).json({ token: accessToken });
  }),
);

router.post(
  "/logout",
  asyncHandler(async (req, res) => {
    const token = req.cookies.refreshToken;
    if (token) {
      await prisma.refreshToken.deleteMany({ where: { token } });
    }
    res.clearCookie("refreshToken", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
    });
    return res.status(204).end();
  }),
);

router.get(
  "/me",
  authenticate,
  asyncHandler(async (req, res) => {
    const user = await prisma.user.findUnique({ where: { id: req.user!.id } });
    if (!user) {
      throw new AppError(404, "User not found");
    }

    const { password: _, ...safeUser } = user;

    return res.status(200).json({ data: safeUser });
  }),
);

export default router;
