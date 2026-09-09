-- Manually-pasted BGG session cookie (login/api/v1 is Cloudflare-challenged;
-- the write endpoints are not, so writes can use this cookie directly).
ALTER TABLE "Settings" ADD COLUMN IF NOT EXISTS "bggCookie" TEXT;
