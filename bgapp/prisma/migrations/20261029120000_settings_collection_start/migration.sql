-- Inizio della collezione nelle Impostazioni. Prima era una costante nel codice
-- delle Statistiche (01/09/2024): la si porta qui con lo stesso valore, così
-- nessun numero cambia. Additiva.
ALTER TABLE "Settings" ADD COLUMN IF NOT EXISTS "collectionStart" TIMESTAMP(3);
UPDATE "Settings" SET "collectionStart" = '2024-09-01 00:00:00' WHERE "id" = 1 AND "collectionStart" IS NULL;
