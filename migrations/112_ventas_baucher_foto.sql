-- 112) Foto del baucher de ventas con transferencia --------------------------
-- Al cobrar una venta pagada con transferencia el cajero adjunta la foto del
-- comprobante desde el formulario de nueva venta del dashboard: es la única
-- constancia de que el pago entró. El payload trae la imagen en base64,
-- `registrarVenta` la guarda en `public/img/sales` y acá solo se registra el
-- nombre del archivo.
ALTER TABLE ventas ADD COLUMN IF NOT EXISTS baucher_foto TEXT;
