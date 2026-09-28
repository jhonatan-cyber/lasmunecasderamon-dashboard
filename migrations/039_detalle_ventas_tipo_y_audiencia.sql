-- 039) Qué se vendió en cada detalle: botella o shot, y a quién se le sirvió el shot --
--
-- Hasta ahora la distinción botella/shot vivía SOLO en el payload del POST /api/sales:
-- InventoryRepository.consume la usaba para descontar ml de la botella abierta y
-- después se perdía. Nadie podía preguntar "¿cuánto entró por shots?" porque
-- detalle_ventas no guardaba el dato.
--
-- Pero hay una distinción más fina que sí es plata: un shot se puede cobrar a precio de
-- cliente o a precio de anfitriona (Bar → Transferencia, "Precio shot anfitriona",
-- guardado en inventario_presentaciones.opciones_venta). Quien vende elige uno de los
-- dos en el modal de productos, y hasta hoy esa elección también se descartaba.
--
-- Dos columnas, cada una con un solo significado:
--   tipo_venta       'botella' (por defecto) o 'shot'. Espeja lo que ya viajaba en el
--                    payload; sin este dato no hay forma de separar shots en reportes.
--   shot_anfitriona  true cuando ese shot se cobró al precio de anfitriona. Solo tiene
--                    sentido con tipo_venta = 'shot' (lo exige el CHECK).
--
-- Las filas anteriores quedan en ('botella', false): no se puede reconstruir a qué precio
-- se vendió un shot viejo, y el movimiento de inventario que descuenta ml ("venta" con
-- ml != null) no guarda trazabilidad por detalle. La ausencia es informativa — "no se
-- sabe"— y por eso no se intenta un backfill.
ALTER TABLE detalle_ventas
  ADD COLUMN IF NOT EXISTS tipo_venta varchar(12) NOT NULL DEFAULT 'botella',
  ADD COLUMN IF NOT EXISTS shot_anfitriona boolean NOT NULL DEFAULT false;

-- Vocabulario cerrado: los dos tipos que ya conoce el carro de ventas.
ALTER TABLE detalle_ventas
  ADD CONSTRAINT detalle_ventas_tipo_venta_check
  CHECK (tipo_venta IN ('botella', 'shot'));

-- Coherencia: nadie puede ser "shot de anfitriona" sin ser un shot.
ALTER TABLE detalle_ventas
  ADD CONSTRAINT detalle_ventas_shot_anfitriona_check
  CHECK (NOT shot_anfitriona OR tipo_venta = 'shot');
