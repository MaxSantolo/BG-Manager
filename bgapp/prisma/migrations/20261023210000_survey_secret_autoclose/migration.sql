-- Voto segreto + chiusura automatica (per numero votanti o per data). Additiva.
ALTER TABLE "Survey" ADD COLUMN IF NOT EXISTS "secret" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Survey" ADD COLUMN IF NOT EXISTS "closeAfterVoters" INTEGER;
ALTER TABLE "Survey" ADD COLUMN IF NOT EXISTS "closeAt" TIMESTAMP(3);
