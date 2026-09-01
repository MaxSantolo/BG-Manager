-- Per-game rule for deciding a play's winner (high|low|coop|manual).
ALTER TABLE "Game" ADD COLUMN IF NOT EXISTS "winMode" TEXT NOT NULL DEFAULT 'high';
