-- CreateTable
CREATE TABLE "Game" (
    "id" SERIAL NOT NULL,
    "bggId" INTEGER,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'Base',
    "cost" DOUBLE PRECISION,
    "salePrice" DOUBLE PRECISION,
    "status" TEXT NOT NULL DEFAULT 'InCollezione',
    "insert" TEXT NOT NULL DEFAULT 'No',
    "sleeves" TEXT NOT NULL DEFAULT 'No',
    "sleeveData" TEXT NOT NULL DEFAULT '[]',
    "purchaseDate" TIMESTAMP(3),
    "saleDate" TIMESTAMP(3),
    "thumbnail" TEXT,
    "bggRating" DOUBLE PRECISION,
    "bggWeight" DOUBLE PRECISION,
    "minPlayers" INTEGER,
    "maxPlayers" INTEGER,
    "playTime" INTEGER,
    "yearPublished" INTEGER,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Game_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WishlistGame" (
    "id" SERIAL NOT NULL,
    "bggId" INTEGER,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'Base',
    "valueRange" TEXT,
    "desirability" INTEGER NOT NULL DEFAULT 3,
    "status" TEXT,
    "insert" TEXT NOT NULL DEFAULT 'No',
    "sleeves" TEXT NOT NULL DEFAULT 'No',
    "sleeveData" TEXT NOT NULL DEFAULT '[]',
    "thumbnail" TEXT,
    "bggRating" DOUBLE PRECISION,
    "bggWeight" DOUBLE PRECISION,
    "minPlayers" INTEGER,
    "maxPlayers" INTEGER,
    "playTime" INTEGER,
    "yearPublished" INTEGER,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WishlistGame_pkey" PRIMARY KEY ("id")
);
