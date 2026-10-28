-- 107) Foto del baucher de servicios solicitados con transferencia ----------
-- Al solicitar un servicio pagado con transferencia el garzón saca la foto del
-- baucher desde la app: es la constancia de que el pago entró. El payload la
-- trae en base64, `ServiceRequestRepository.create` la guarda en
-- `public/img/orders` y acá solo se registra el nombre del archivo, igual que
-- en `pedidos.baucher_foto` y `entradas_clientes.baucher_foto`.
ALTER TABLE solicitudes_servicios ADD COLUMN IF NOT EXISTS baucher_foto TEXT;
