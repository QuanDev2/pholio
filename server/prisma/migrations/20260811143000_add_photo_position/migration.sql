-- Re-add display order for a post's photos. It was dropped 2026-07-17 because a
-- server-side count(+1) raced under parallel uploads; this version is assigned
-- client-side (the server only stores it), so there is no race. createdAt is
-- unreliable for order since parallel uploads register in completion order.
-- AlterTable
ALTER TABLE "Photo" ADD COLUMN "position" INTEGER NOT NULL DEFAULT 0;

-- Backfill existing rows: number each post's photos by createdAt (0-based).
WITH ordered AS (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY "postId" ORDER BY "createdAt" ASC) - 1 AS rn
  FROM "Photo"
)
UPDATE "Photo" p SET "position" = o.rn
FROM ordered o WHERE p.id = o.id;
