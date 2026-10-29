-- Carte del gioco da BGG (sezione Sleeves), caricate a richiesta. Additiva.
ALTER TABLE "Game" ADD COLUMN IF NOT EXISTS "cardSetId" INTEGER;
ALTER TABLE "Game" ADD COLUMN IF NOT EXISTS "cardTypes" TEXT;
ALTER TABLE "Game" ADD COLUMN IF NOT EXISTS "cardsCheckedAt" TIMESTAMP(3);
