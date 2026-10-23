-- Gradimento 1-5 per gioco, dato insieme al voto. Opzionale.
ALTER TABLE "Vote" ADD COLUMN IF NOT EXISTS "rating" INTEGER;
