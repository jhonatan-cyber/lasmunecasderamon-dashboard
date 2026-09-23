-- La migración previa de aprobación usó 'pendiente' para movimientos ya ejecutados.
-- Solo normaliza registros anteriores al nuevo flujo y sin reserva asociada.
UPDATE inventario_movimientos m SET estado = 'historica'
WHERE m.tipo = 'traspaso' AND m.estado = 'pendiente' AND m.aceptado_por IS NULL
  AND m.fecha_crea < (SELECT executed_at::timestamp FROM _postgres_migrations WHERE filename = '012_recepcion_transferencias.sql')
  AND NOT EXISTS (SELECT 1 FROM inventario_unidades u WHERE u.transferencia_id = m.id);
ALTER TABLE inventario_movimientos ALTER COLUMN estado SET DEFAULT 'historica';
