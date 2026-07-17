import z from "zod";

export const uploadUrlSchema = z.object({
  contentType: z.enum(["image/jpeg", "image/png", "image/webp"]),
});

// Body for POST /posts/:id/photos — registers an already-uploaded S3 object as
// a Photo row. The client sends back the `key` it received from upload-url.
// `status` is NOT accepted here: the server owns it.
export const registerPhotoSchema = z.object({
  key: z.string().min(1),
  caption: z.string().max(500).optional(),
});
