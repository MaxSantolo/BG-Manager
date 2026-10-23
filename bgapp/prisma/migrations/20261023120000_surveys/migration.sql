-- Sondaggi "cosa giochiamo": zona multi-utente dietro la password sondaggi.
-- Migrazione puramente additiva: non tocca nessuna tabella esistente.

CREATE TABLE IF NOT EXISTS "Survey" (
  "id"                  SERIAL PRIMARY KEY,
  "title"               TEXT NOT NULL,
  "createdById"         INTEGER NOT NULL,
  "createdByName"       TEXT NOT NULL,
  "multiVote"           BOOLEAN NOT NULL DEFAULT false,
  "maxPicks"            INTEGER,
  "proposersCanVoteOwn" BOOLEAN NOT NULL DEFAULT false,
  "status"              TEXT NOT NULL DEFAULT 'open',
  "createdAt"           TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"           TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS "Survey_status_idx" ON "Survey"("status");

CREATE TABLE IF NOT EXISTS "SurveyOption" (
  "id"             SERIAL PRIMARY KEY,
  "surveyId"       INTEGER NOT NULL,
  "gameId"         INTEGER NOT NULL,
  "gameName"       TEXT NOT NULL,
  "gameThumbnail"  TEXT,
  "proposedById"   INTEGER NOT NULL,
  "proposedByName" TEXT NOT NULL,
  "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX IF NOT EXISTS "SurveyOption_surveyId_gameId_key" ON "SurveyOption"("surveyId", "gameId");
CREATE INDEX IF NOT EXISTS "SurveyOption_surveyId_idx" ON "SurveyOption"("surveyId");

CREATE TABLE IF NOT EXISTS "Vote" (
  "id"        SERIAL PRIMARY KEY,
  "surveyId"  INTEGER NOT NULL,
  "optionId"  INTEGER NOT NULL,
  "voterId"   INTEGER NOT NULL,
  "voterName" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX IF NOT EXISTS "Vote_surveyId_voterId_optionId_key" ON "Vote"("surveyId", "voterId", "optionId");
CREATE INDEX IF NOT EXISTS "Vote_surveyId_idx" ON "Vote"("surveyId");
CREATE INDEX IF NOT EXISTS "Vote_optionId_idx" ON "Vote"("optionId");

-- FK con cancellata a cascata: eliminare un sondaggio porta via opzioni e voti.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'SurveyOption_surveyId_fkey') THEN
    ALTER TABLE "SurveyOption" ADD CONSTRAINT "SurveyOption_surveyId_fkey"
      FOREIGN KEY ("surveyId") REFERENCES "Survey"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Vote_surveyId_fkey') THEN
    ALTER TABLE "Vote" ADD CONSTRAINT "Vote_surveyId_fkey"
      FOREIGN KEY ("surveyId") REFERENCES "Survey"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Vote_optionId_fkey') THEN
    ALTER TABLE "Vote" ADD CONSTRAINT "Vote_optionId_fkey"
      FOREIGN KEY ("optionId") REFERENCES "SurveyOption"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
