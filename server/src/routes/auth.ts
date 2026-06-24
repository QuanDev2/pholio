import { Router } from "express";
import { asyncHandler } from "../middleware/asyncHandler";
import { loginSchema, registerSchema } from "../schemas/auth";
import { validate } from "../middleware/validate";
import { prisma } from "../lib/prisma";
import bcrypt from "bcrypt";
import { signAccessToken } from "../lib/jwt";

const router = Router();

router.post(
  "/register",
  validate(registerSchema),
  asyncHandler(async (req, res) => {
    const { email, username, name, password } = req.body;

    const existingEmail = await prisma.user.findUnique({ where: { email } });
    if (existingEmail) {
      return res.status(409).json({ error: "Email already exists" });
    }

    const existingUsername = await prisma.user.findUnique({ where: { username } });
    if (existingUsername) {
      return res.status(409).json({ error: "Username already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const user = await prisma.user.create({
      data: { email, username, name, password: hashedPassword },
    });

    const token = signAccessToken(user.id);

    const { password: _, ...safeUser } = user;

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
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const { password: _, ...safeUser } = user;
    const token = signAccessToken(user.id);

    return res.status(200).json({ data: safeUser, token });
  }),
);

export default router;
