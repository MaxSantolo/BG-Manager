-- Enforce one row per BGG id. Partial indexes so manual games with no bggId
-- (NULL) are exempt and may still repeat. Creating these would fail if
-- duplicates already existed, so the collection was verified duplicate-free first.
CREATE UNIQUE INDEX IF NOT EXISTS "Game_bggId_unique"
  ON "Game" ("bggId") WHERE "bggId" IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS "WishlistGame_bggId_unique"
  ON "WishlistGame" ("bggId") WHERE "bggId" IS NOT NULL;
