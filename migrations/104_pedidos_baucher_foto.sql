-- 104) Foto del baucher de pedidos con transferencia -------------------------
-- Al tomar un pedido pagado con transferencia el garzón saca la foto del
-- baucher desde la app: es la única constancia de que el pago entró. El payload
-- del pedido trae la imagen en base64, `OrderRepository.create` la guarda en
-- `public/img/orders` y acá solo se registra el nombre del archivo.
ALTER TABLE pedidos ADD COLUMN IF NOT EXISTS baucher_foto TEXT;
