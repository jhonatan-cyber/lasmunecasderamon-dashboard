-- 019) proveedor y teléfono en compras -------------------------------------------
ALTER TABLE compras ADD COLUMN IF NOT EXISTS proveedor varchar(120);
ALTER TABLE compras ADD COLUMN IF NOT EXISTS telefono varchar(30);
