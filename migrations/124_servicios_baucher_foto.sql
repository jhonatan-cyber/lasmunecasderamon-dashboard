-- 124) Foto del baucher de servicios creados directamente con transferencia
--
-- Extiende el patrón de pedidos.baucher_foto, entradas_clientes.baucher_foto,
-- solicitudes_servicios.baucher_foto y entas.baucher_foto a la tabla servicios.

ALTER TABLE servicios ADD COLUMN IF NOT EXISTS baucher_foto TEXT;
