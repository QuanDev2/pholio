import { prisma } from "./prisma";
import type { HttpError } from "../middleware/errorHandler";

// Throws 404 if the post doesn't exist, 403 if `userId` isn't its author.
// Returns the (lean) post so the caller can skip a second fetch.
export async function assertOwnsPost(postId: string, userId: string) {
  const post = await prisma.post.findUnique({
    where: { id: postId },
    select: { id: true, authorId: true }, // only what the guard needs
  });

  if (!post) {
    const err: HttpError = new Error("Post not found");
    err.status = 404;
    throw err;
  }

  if (post.authorId !== userId) {
    const err: HttpError = new Error("Forbidden");
    err.status = 403;
    throw err;
  }

  return post;
}
