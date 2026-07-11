-- CreateEnum
CREATE TYPE "PhotoStatus" AS ENUM ('pending', 'processing', 'ready', 'error');

-- AlterTable
ALTER TABLE "Photo" ADD COLUMN     "status" "PhotoStatus" NOT NULL DEFAULT 'pending';
