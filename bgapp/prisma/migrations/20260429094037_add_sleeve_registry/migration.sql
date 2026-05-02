-- CreateTable
CREATE TABLE "Sleeve" (
    "id" SERIAL NOT NULL,
    "size" TEXT NOT NULL,
    "label" TEXT,
    "quantity" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Sleeve_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GameSleeve" (
    "id" SERIAL NOT NULL,
    "gameId" INTEGER NOT NULL,
    "sleeveId" INTEGER NOT NULL,
    "qty" INTEGER NOT NULL DEFAULT 1,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GameSleeve_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "GameSleeve" ADD CONSTRAINT "GameSleeve_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "Game"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GameSleeve" ADD CONSTRAINT "GameSleeve_sleeveId_fkey" FOREIGN KEY ("sleeveId") REFERENCES "Sleeve"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
