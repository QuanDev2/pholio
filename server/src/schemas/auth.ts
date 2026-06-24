import { z } from "zod";

const RESERVED_USERNAMES = new Set([
  "admin",
  "administrator",
  "root",
  "support",
  "help",
  "about",
  "login",
  "register",
  "settings",
  "editor",
  "explore",
  "user",
  "api",
  "pholio",
  "official",
]);

export const registerSchema = z.object({
  username: z
    .string()
    .min(6, "Username must be at least 6 characters")
    .max(20)
    .regex(/^[a-z0-9_-]+$/i, "Username can only contain letters, numbers, hyphens, and underscores")
    .transform((u) => u.toLowerCase())
    .refine((u) => !RESERVED_USERNAMES.has(u), "This username is reserved"),
  password: z.string().min(8, "Password must be at least 8 characters").max(72),
  name: z.string().min(1),
  email: z.email(),
});

export const loginSchema = z.object({
  email: z.email(),
  password: z.string().min(1),
});
