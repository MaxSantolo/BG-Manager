-- Colonne legacy delle bustine (Sì/NA/No dall'Excel iniziale), sostituite dal
-- magazzino Sleeve/GameSleeve. Eliminate su decisione esplicita di Max; i campi
-- erano già fuori dallo schema Prisma (commit f740127). Backup dei valori e
-- script di ripristino (provato) conservati fuori dal repo, che è pubblico.
ALTER TABLE "Game" DROP COLUMN IF EXISTS "sleeves", DROP COLUMN IF EXISTS "sleeveData";
ALTER TABLE "WishlistGame" DROP COLUMN IF EXISTS "sleeves", DROP COLUMN IF EXISTS "sleeveData";
