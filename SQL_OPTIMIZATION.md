# Recomendaciones de Optimización SQL

## Análisis

Se encontraron 32 consultas `SELECT * FROM` en los módulos del dashboard. La
mayoría son consultas internas de administración donde `SELECT *` es aceptable,
pero algunas pueden optimizarse.

## Consultas que podrían optimizarse

### 1. `modules/identidad/autenticacion/consultas.ts` (línea 449)

```sql
SELECT * FROM usuarios WHERE id_usuario = ?
```

**Recomendación**: Seleccionar solo los campos necesarios para el perfil del
usuario.

### 2. `modules/identidad/roles/registro.ts` (línea 86)

```sql
SELECT * FROM role_permissions pr INNER JOIN roles r ON r.id_rol = pr.role_id
```

**Recomendación**: Sin WHERE ni LIMIT — podría devolver muchos registros.
Agregar los campos específicos.

### 3. `modules/inventario/limpieza/servicio.ts` (línea 27)

```sql
SELECT * FROM limpieza_stock
```

**Recomendación**: Si solo se necesitan ciertos campos, especificarlos.

### 4. `modules/inventario/movimientos/repositorio.ts` (línea 12)

```sql
SELECT * FROM movimientos
```

**Recomendación**: Consultas de historial suelen necesitar solo campos
específicos.

### 5. `modules/personal/nomina/repositorio.ts` (línea 22)

```sql
SELECT * FROM nomina
```

**Recomendación**: La nómina puede tener muchos campos; seleccionar solo los
necesarios.

## Consultas donde SELECT * es aceptable

- `error_logs` — Diagnóstico, se necesitan todos los campos
- `backups` — Restauración, se necesitan todos los datos
- `asistencias` — Consulta por usuario y fecha, resultado pequeño
- `notificaciones` — Con LIMIT 50, resultado controlado

## Recomendaciones generales

### 1. Índices

Verificar que las consultas frecuentes tengan índices apropiados:

```sql
-- Ejemplo: verificar índices en tablas críticas
SELECT tablename, indexname, indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename IN ('ventas', 'servicios', 'cuentas', 'pedidos', 'usuarios')
ORDER BY tablename;
```

### 2. EXPLAIN ANALYZE

Para las consultas más frecuentes, usar `EXPLAIN ANALYZE` para identificar
cuellos de botella:

```sql
EXPLAIN ANALYZE
SELECT * FROM ventas WHERE fecha BETWEEN '2024-01-01' AND '2024-12-31';
```

### 3. Paginación

Asegurar que las consultas de listados usen `LIMIT` y `OFFSET` (o keyset
pagination):

```sql
-- En lugar de:
SELECT * FROM ventas ORDER BY fecha DESC;

-- Usar:
SELECT id, codigo, fecha, total FROM ventas ORDER BY fecha DESC LIMIT 50 OFFSET 0;
```

### 4. Consultas N+1

Evitar consultas N+1 en los loops. Usar JOINs o consultas batch:

```typescript
// Malo: N+1
const ventas = await query('SELECT * FROM ventas');
for (const venta of ventas) {
  const detalles = await query('SELECT * FROM detalles WHERE venta_id = ?', [
    venta.id
  ]);
}

// Bueno: JOIN
const ventas = await query(`
  SELECT v.*, d.* FROM ventas v
  LEFT JOIN detalles d ON d.venta_id = v.id
`);
```

## Herramientas de monitoreo

### pg_stat_statements

Habilitar `pg_stat_statements` para identificar las consultas más lentas:

```sql
SELECT query, calls, total_exec_time, mean_exec_time, rows
FROM pg_stat_statements
ORDER BY mean_exec_time DESC
LIMIT 20;
```

### Logs de consultas lentas

Configurar en `postgresql.conf`:

```
log_min_duration_statement = 1000  -- Log queries > 1 second
```
