-- 105) Foto del baucher de las entradas cobradas con transferencia ------------
-- En la puerta el garzón cobra la entrada; si el pago es con transferencia la
-- app pide la foto del baucher y el servidor la guarda en `public/img/tickets`.
-- Acá solo queda el nombre del archivo, igual que en `pedidos.baucher_foto`.
ALTER TABLE entradas_clientes ADD COLUMN IF NOT EXISTS baucher_foto TEXT;
