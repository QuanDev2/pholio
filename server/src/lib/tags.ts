import { prisma } from "./prisma";
import type { HttpError } from "../middleware/errorHandler";

// Throws a 400 (caught by the global error handler via asyncHandler's
// .catch(next)) if any id in `tags` doesn't match an existing Tag.
export async function assertTagsExist(tags: string[]): Promise<void> {
  const found = await prisma.tag.findMany({
    where: { id: { in: tags } },
    select: { id: true },
  });

  if (found.length !== tags.length) {
    const err: HttpError = new Error("unknown tag");
    err.status = 400;
    throw err;
  }
}
