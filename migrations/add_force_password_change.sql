-- S7: Agregar columna force_password_change a usuarios
-- Cuando es 1, el usuario debe cambiar su contraseña en el primer login

ALTER TABLE usuarios
  ADD COLUMN force_password_change TINYINT(1) NOT NULL DEFAULT 1
  AFTER qr_token;

-- Actualizar usuarios existentes: marcar como que NO necesitan cambio forzado
-- (para no romper el login de usuarios actuales)
UPDATE usuarios SET force_password_change = 0 WHERE estado = 1;
