-- Preordini: provenienza (registro libero), pagato, consegna prevista. Additiva.
CREATE TABLE IF NOT EXISTS "PreorderSource" (
  "id"        SERIAL PRIMARY KEY,
  "name"      TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX IF NOT EXISTS "PreorderSource_name_key" ON "PreorderSource"("name");

ALTER TABLE "Game" ADD COLUMN IF NOT EXISTS "preorderSourceId" INTEGER;
ALTER TABLE "Game" ADD COLUMN IF NOT EXISTS "preorderPaid" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Game" ADD COLUMN IF NOT EXISTS "preorderEta" TIMESTAMP(3);
CREATE INDEX IF NOT EXISTS "Game_preorderSourceId_idx" ON "Game"("preorderSourceId");

-- Cancellare una provenienza svuota il campo, non tocca i giochi.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Game_preorderSourceId_fkey') THEN
    ALTER TABLE "Game" ADD CONSTRAINT "Game_preorderSourceId_fkey"
      FOREIGN KEY ("preorderSourceId") REFERENCES "PreorderSource"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
