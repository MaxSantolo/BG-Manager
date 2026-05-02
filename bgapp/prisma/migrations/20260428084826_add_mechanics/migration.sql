-- AlterTable
ALTER TABLE "Game" ADD COLUMN     "mechanics" TEXT NOT NULL DEFAULT '[]';

-- AlterTable
ALTER TABLE "WishlistGame" ADD COLUMN     "mechanics" TEXT NOT NULL DEFAULT '[]';
