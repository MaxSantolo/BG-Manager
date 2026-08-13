
-- CreateIndex
CREATE INDEX "Game_bggId_idx" ON "Game"("bggId");

-- CreateIndex
CREATE INDEX "Game_status_idx" ON "Game"("status");

-- CreateIndex
CREATE INDEX "GameSleeve_gameId_idx" ON "GameSleeve"("gameId");

-- CreateIndex
CREATE INDEX "GameSleeve_sleeveId_idx" ON "GameSleeve"("sleeveId");

-- CreateIndex
CREATE INDEX "Loan_gameId_idx" ON "Loan"("gameId");

-- CreateIndex
CREATE INDEX "Play_date_idx" ON "Play"("date");

-- CreateIndex
CREATE INDEX "Play_gameId_idx" ON "Play"("gameId");

-- CreateIndex
CREATE INDEX "Play_bggGameId_idx" ON "Play"("bggGameId");

