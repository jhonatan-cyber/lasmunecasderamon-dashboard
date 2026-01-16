# Información del Garzón en Ventas

## Resumen de Cambios

Se ha agregado la información del garzón (mesero) que realizó el pedido en el detalle de las ventas. Esto permite identificar quién atendió originalmente cuando una venta proviene de un pedido.

## Cambios Realizados

### 1. Detalle de Venta - GET `/api/ventas/[id]`

**Archivo modificado:** `admin-dashboard/pages/api/ventas/[id].ts`

**Consulta actualizada:**
```sql
SELECT 
  v.*,
  COALESCE(CONCAT(c.nombre, " ", c.apellido), 'Sin cliente registrado') as cliente_nombre,
  h.nombre as habitacion_numero,
  CASE 
    WHEN v.pedido_id IS NOT NULL THEN CONCAT(g.nombre, " ", g.apellido)
    ELSE NULL
  END as garzon_nombre,
  CASE 
    WHEN v.pedido_id IS NOT NULL THEN g.nick
    ELSE NULL
  END as garzon_nick
FROM ventas v
LEFT JOIN clientes c ON v.cliente_id = c.id_cliente
LEFT JOIN habitaciones h ON v.habitacion_id = h.id_habitacion
LEFT JOIN pedidos p ON v.pedido_id = p.id_pedido
LEFT JOIN usuarios g ON p.mesero_id = g.id_usuario
WHERE v.id_venta = ?
```

**Nuevos campos en la respuesta:**
- `garzon_nombre`: Nombre completo del garzón (ej: "Juan Pérez")
- `garzon_nick`: Nick del garzón (ej: "juanp")

### 2. Lista de Ventas - GET `/api/sales`

**Archivo modificado:** `admin-dashboard/pages/api/sales.ts`

**Consulta actualizada:**
```sql
SELECT 
  v.id_venta, 
  v.codigo,
  v.total, 
  v.fecha_crea, 
  v.estado, 
  v.metodo_pago, 
  v.propina, 
  v.cliente_id, 
  COALESCE(CONCAT(c.nombre, ' ', c.apellido), 'Sin cliente registrado') as cliente_nombre,
  c.apellido as cliente_apellido,
  h.nombre as habitacion_nombre,
  CASE 
    WHEN v.pedido_id IS NOT NULL THEN CONCAT(g.nombre, ' ', g.apellido)
    ELSE NULL
  END as garzon_nombre,
  CASE 
    WHEN v.pedido_id IS NOT NULL THEN g.nick
    ELSE NULL
  END as garzon_nick,
  GROUP_CONCAT(u.nick SEPARATOR ', ') as usuarios_nicks
FROM ventas v 
LEFT JOIN clientes c ON v.cliente_id = c.id_cliente 
LEFT JOIN habitaciones h ON v.habitacion_id = h.id_habitacion
LEFT JOIN pedidos p ON v.pedido_id = p.id_pedido
LEFT JOIN usuarios g ON p.mesero_id = g.id_usuario
LEFT JOIN ventas_usuarios vu ON v.id_venta = vu.venta_id
LEFT JOIN usuarios u ON vu.usuario_id = u.id_usuario 
GROUP BY v.id_venta, v.codigo, v.total, v.fecha_crea, v.estado, v.metodo_pago, v.propina, v.cliente_id, c.nombre, c.apellido, h.nombre, v.pedido_id, g.nombre, g.apellido, g.nick
ORDER BY v.fecha_crea DESC
```

### 3. Solicitar Anulación - POST `/api/ventas/[id]/solicitar-anulacion`

**Archivo modificado:** `admin-dashboard/pages/api/ventas/[id]/solicitar-anulacion.ts`

**Consulta actualizada:**
```sql
SELECT 
  v.*,
  COALESCE(CONCAT(c.nombre, " ", c.apellido), 'Sin cliente registrado') as cliente_nombre,
  CASE 
    WHEN v.pedido_id IS NOT NULL THEN CONCAT(g.nombre, " ", g.apellido)
    ELSE NULL
  END as garzon_nombre,
  CASE 
    WHEN v.pedido_id IS NOT NULL THEN g.nick
    ELSE NULL
  END as garzon_nick
FROM ventas v
LEFT JOIN clientes c ON v.cliente_id = c.id_cliente
LEFT JOIN pedidos p ON v.pedido_id = p.id_pedido
LEFT JOIN usuarios g ON p.mesero_id = g.id_usuario
WHERE v.id_venta = ?
```

## Relación entre Tablas

```
ventas
  └─ pedido_id (FK) → pedidos
                        └─ mesero_id (FK) → usuarios (garzón)
```

## Casos de Uso

### Venta con Pedido
Si la venta tiene un `pedido_id` (no es NULL):
- Se muestra el nombre completo del garzón: `garzon_nombre`
- Se muestra el nick del garzón: `garzon_nick`

### Venta sin Pedido
Si la venta NO tiene un `pedido_id` (es NULL):
- `garzon_nombre` será `NULL` (campo oculto)
- `garzon_nick` será `NULL` (campo oculto)

**Nota:** Se usa `CASE WHEN v.pedido_id IS NOT NULL` para asegurar que solo se muestren los datos del garzón cuando la venta proviene de un pedido.

## Ejemplo de Respuesta

### Venta con Pedido:
```json
{
  "id_venta": 123,
  "codigo": "V-2024-001",
  "total": 50000,
  "cliente_nombre": "María González",
  "habitacion_nombre": "Habitación 101",
  "garzon_nombre": "Juan Pérez",
  "garzon_nick": "juanp",
  "usuarios_nicks": "ana, maria, lucia",
  ...
}
```

### Venta sin Pedido:
```json
{
  "id_venta": 124,
  "codigo": "V-2024-002",
  "total": 30000,
  "cliente_nombre": "Sin cliente registrado",
  "habitacion_nombre": null,
  "garzon_nombre": null,
  "garzon_nick": null,
  "usuarios_nicks": "ana, maria",
  ...
}
```

## Archivos Modificados

- ✅ `pages/api/ventas/[id].ts` - Detalle de venta (GET y PUT)
- ✅ `pages/api/sales.ts` - Lista de ventas
- ✅ `pages/api/ventas/[id]/solicitar-anulacion.ts` - Solicitud de anulación

## Beneficios

1. **Trazabilidad**: Se puede identificar quién atendió originalmente el pedido
2. **Información completa**: El detalle de venta muestra toda la información relevante
3. **Opcional**: Si la venta no proviene de un pedido, los campos son NULL
4. **Consistencia**: Usa LEFT JOIN para mantener compatibilidad con ventas sin pedido

## Pruebas Recomendadas

1. Ver detalle de una venta que proviene de un pedido
2. Ver detalle de una venta que NO proviene de un pedido
3. Verificar que en la lista de ventas aparezca el garzón cuando corresponda
4. Verificar que las solicitudes de anulación incluyan la información del garzón

---

**Fecha de actualización**: 15 de enero de 2026
**Estado**: ✅ Completado y verificado
