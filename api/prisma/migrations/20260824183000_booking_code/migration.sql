-- Código legible de reserva (BK-XXXXXX) para soporte y UI en mono.
ALTER TABLE "bookings" ADD COLUMN "code" TEXT;
UPDATE "bookings" SET "code" = 'BK-' || upper(substring(md5(random()::text) from 1 for 6)) WHERE "code" IS NULL;
ALTER TABLE "bookings" ALTER COLUMN "code" SET NOT NULL;
CREATE UNIQUE INDEX "bookings_code_key" ON "bookings"("code");
