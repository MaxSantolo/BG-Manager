-- Le proposte vengono da BoardGameGeek, non dalla collezione: l'opzione è
-- identificata dal bggId. La tabella è appena nata e ancora vuota, il rename è
-- sicuro.
ALTER TABLE "SurveyOption" RENAME COLUMN "gameId" TO "bggId";
ALTER INDEX "SurveyOption_surveyId_gameId_key" RENAME TO "SurveyOption_surveyId_bggId_key";

-- Snapshot numero giocatori, per proporre la divisione in tavoli.
ALTER TABLE "SurveyOption" ADD COLUMN IF NOT EXISTS "minPlayers" INTEGER;
ALTER TABLE "SurveyOption" ADD COLUMN IF NOT EXISTS "maxPlayers" INTEGER;
