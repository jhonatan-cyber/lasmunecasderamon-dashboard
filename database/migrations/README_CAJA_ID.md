# Migración: Agregar campo caja_id a ventas y servicios

## Descripción
Esta migración agrega el campo `caja_id` a las tablas `ventas` y `servicios` para relacionar directamente cada transacción con la caja en la que se registró.

## Beneficios
- **Filtrado más eficiente**: Consultas directas por `caja_id` en lugar de rangos de fechas
- **Integridad referencial**: Foreign keys aseguran que las transacciones estén vinculadas a cajas válidas
- **Mejor rendimiento**: Índices optimizados para búsquedas por caja
- **Datos históricos**: Actualiza automáticamente registros existentes con su caja correspondiente

## Cambios en la base de datos

### Tabla `ventas`
```sql
ALTER TABLE `ventas` 
ADD COLUMN `caja_id` INT NULL AFTER `pedido_id`,
ADD INDEX `idx_ventas_caja_id` (`caja_id`),
ADD CONSTRAINT `fk_ventas_caja` 
  FOREIGN KEY (`caja_id`) 
  REFERENCES `cajas` (`id_caja`) 
  ON DELETE SET NULL 
  ON UPDATE CASCADE;
```

### Tabla `servicios`
```sql
ALTER TABLE `servicios` 
ADD COLUMN `caja_id` INT NULL AFTER `metodo_pago`,
ADD INDEX `idx_servicios_caja_id` (`caja_id`),
ADD CONSTRAINT `fk_servicios_caja` 
  FOREIGN KEY (`caja_id`) 
  REFERENCES `cajas` (`id_caja`) 
  ON DELETE SET NULL 
  ON UPDATE CASCADE;
```

## Cómo ejecutar la migración

### Opción 1: Usando el script Node.js (Recomendado)
```bash
cd admin-dashboard
node scripts/run-migration-caja-id.js
```

### Opción 2: Manualmente con MySQL
```bash
mysql -u root -p nuwesoft < database/migrations/add_caja_id_to_ventas_servicios.sql
```

## Verificación post-migración

Después de ejecutar la migración, verifica que:

1. **Los campos fueron creados correctamente:**
```sql
DESCRIBE ventas;
DESCRIBE servicios;
```

2. **Los índices fueron creados:**
```sql
SHOW INDEX FROM ventas WHERE Key_name = 'idx_ventas_caja_id';
SHOW INDEX FROM servicios WHERE Key_name = 'idx_servicios_caja_id';
```

3. **Los datos existentes fueron actualizados:**
```sql
-- Verificar ventas con caja_id asignado
SELECT COUNT(*) as total, COUNT(caja_id) as con_caja FROM ventas;

-- Verificar servicios con caja_id asignado
SELECT COUNT(*) as total, COUNT(caja_id) as con_caja FROM servicios;
```

## Cambios en el código

### Backend
- **`/api/sales` (POST)**: Ahora guarda automáticamente el `caja_id` de la caja abierta
- **`/api/sales` (GET)**: Filtra por `caja_id` directamente
- **`/api/servicios` (POST)**: Ahora guarda automáticamente el `caja_id` de la caja abierta
- **`/api/servicios` (GET)**: Filtra por `caja_id` directamente

### Comportamiento
- Cuando se crea una venta o servicio, se busca la caja abierta actual y se asigna su ID
- Si no hay caja abierta, el campo `caja_id` será NULL
- El filtrado en el detalle de caja ahora es directo: `WHERE caja_id = ?`

## Rollback (si es necesario)

Si necesitas revertir la migración:

```sql
-- Eliminar foreign keys
ALTER TABLE ventas DROP FOREIGN KEY fk_ventas_caja;
ALTER TABLE servicios DROP FOREIGN KEY fk_servicios_caja;

-- Eliminar índices
ALTER TABLE ventas DROP INDEX idx_ventas_caja_id;
ALTER TABLE servicios DROP INDEX idx_servicios_caja_id;

-- Eliminar columnas
ALTER TABLE ventas DROP COLUMN caja_id;
ALTER TABLE servicios DROP COLUMN caja_id;
```

## Notas importantes

- ⚠️ **Backup**: Siempre haz un backup de la base de datos antes de ejecutar migraciones
- ✅ **Compatibilidad**: Esta migración es compatible con datos existentes
- 🔄 **Actualización automática**: Los registros existentes se actualizan automáticamente
- 🆕 **Nuevos registros**: Todos los nuevos registros incluirán el `caja_id` automáticamente
