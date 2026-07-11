import z from "zod";

export const uploadUrlSchema = z.object({
  contentType: z.enum(["image/jpeg", "image/png", "image/webp"]),
});
