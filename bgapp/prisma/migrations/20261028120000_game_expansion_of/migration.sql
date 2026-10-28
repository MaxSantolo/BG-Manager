-- "Espansione per": collegamento facoltativo da un'espansione al suo gioco base.
-- Additiva: colonna nullable, nessun dato esistente toccato.
ALTER TABLE "Game" ADD COLUMN IF NOT EXISTS "expansionOfId" INTEGER;
CREATE INDEX IF NOT EXISTS "Game_expansionOfId_idx" ON "Game"("expansionOfId");

-- Cancellare il gioco base non cancella le espansioni: perdono solo il collegamento.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Game_expansionOfId_fkey') THEN
    ALTER TABLE "Game" ADD CONSTRAINT "Game_expansionOfId_fkey"
      FOREIGN KEY ("expansionOfId") REFERENCES "Game"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
