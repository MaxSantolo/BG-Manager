-- AlterTable
ALTER TABLE "Game" ADD COLUMN     "bggEnrichedAt" TIMESTAMP(3),
ADD COLUMN     "description" TEXT,
ADD COLUMN     "designers" TEXT NOT NULL DEFAULT '[]',
ADD COLUMN     "image" TEXT;

-- AlterTable
ALTER TABLE "WishlistGame" ADD COLUMN     "bggEnrichedAt" TIMESTAMP(3),
ADD COLUMN     "description" TEXT,
ADD COLUMN     "designers" TEXT NOT NULL DEFAULT '[]',
ADD COLUMN     "image" TEXT;
