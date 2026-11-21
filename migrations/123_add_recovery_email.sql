-- 123) Agregar recovery_email a usuarios ------------------------------------
-- Permite que cada usuario configure un correo dedicado para recuperación de
-- contraseña. Cuando está presente, el reset de contraseña envía un código por
-- email en lugar de (o además de) WhatsApp/RUT.
--
-- Idempotente: usa ALTER TABLE ... IF NOT EXISTS.

ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS recovery_email VARCHAR(255) DEFAULT NULL;
