-- Data in cui si gioca, accanto al nome del sondaggio. Opzionale.
ALTER TABLE "Survey" ADD COLUMN IF NOT EXISTS "playDate" TIMESTAMP(3);
