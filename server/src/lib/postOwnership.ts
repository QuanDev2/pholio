import { prisma } from "./prisma";
import { AppError } from "../middleware/errorHandler";

// Throws 404 if the post doesn't exist, 403 if `userId` isn't its author.
// Returns the (lean) post so the caller can skip a second fetch.
export async function assertOwnsPost(postId: string, userId: string) {
  const post = await prisma.post.findUnique({
    where: { id: postId },
    select: { id: true, authorId: true }, // only what the guard needs
  });

  if (!post) {
    throw new AppError(404, "Post not found");
  }

  if (post.authorId !== userId) {
    throw new AppError(403, "Forbidden");
  }

  return post;
}
