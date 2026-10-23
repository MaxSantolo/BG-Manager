-- Numero di giochi vincitori: i top-N più votati su cui distribuire i tavoli
-- alla chiusura. Null = tutti.
ALTER TABLE "Survey" ADD COLUMN IF NOT EXISTS "winnersCount" INTEGER;
