-- "Mai giocato" è calcolato dalle partite; questo flag copre solo i giochi
-- giocati prima che si registrassero le partite.
ALTER TABLE "Game" ADD COLUMN IF NOT EXISTS "playedBefore" BOOLEAN NOT NULL DEFAULT false;

-- Posizione fisica della scatola.
CREATE TABLE IF NOT EXISTS "Location" (
  "id"        SERIAL PRIMARY KEY,
  "name"      TEXT NOT NULL,
  "notes"     TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX IF NOT EXISTS "Location_name_key" ON "Location"("name");

ALTER TABLE "Game" ADD COLUMN IF NOT EXISTS "locationId" INTEGER;
CREATE INDEX IF NOT EXISTS "Game_locationId_idx" ON "Game"("locationId");

-- Cancellare una posizione non deve cancellare i giochi: si limita a svuotarla.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Game_locationId_fkey') THEN
    ALTER TABLE "Game" ADD CONSTRAINT "Game_locationId_fkey"
      FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
