import { z } from "zod";

export const registerSchema = z.object({
  username: z.string().min(6, "Username must be at least 6 characters").max(20),
  password: z.string().min(8, "Password must be at least 8 characters").max(72),
  name: z.string().min(1),
  email: z.email(),
});

export const loginSchema = z.object({
  email: z.email(),
  password: z.string().min(1),
});
