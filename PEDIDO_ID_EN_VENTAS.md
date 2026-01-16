# Agregar pedido_id a Ventas

## Resumen
Se agregó la columna `pedido_id` a la tabla `ventas` para rastrear de qué pedido proviene una venta y poder mostrar el nombre del garzón que realizó el pedido original.

## Cambios en Base de Datos

### Migración: `add_pedido_id_to_ventas.sql`
```sql
ALTER TABLE ventas 
ADD COLUMN pedido_id INT NULL AFTER cliente_id,
ADD CONSTRAINT fk_ventas_pedidos 
  FOREIGN KEY (pedido_id) 
  REFERENCES pedidos(id_pedido) 
  ON DELETE SET NULL 
  ON UPDATE CASCADE;

CREATE INDEX idx_ventas_pedido_id ON ventas(pedido_id);
```

**Características:**
- `pedido_id` es NULL por defecto (ventas pueden crearse sin pedido)
- Foreign key con `ON DELETE SET NULL` (si se elimina el pedido, la venta mantiene su información)
- Índice para mejorar el rendimiento de las consultas

## Cambios en Backend

### 1. API de Ventas (`pages/api/sales.ts`)

**Consulta GET actualizada:**
```typescript
SELECT 
  v.id_venta, 
  v.codigo,
  v.total, 
  v.fecha_crea, 
  v.estado, 
  v.metodo_pago, 
  v.propina, 
  v.cliente_id, 
  v.pedido_id,
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
```

**Campos agregados:**
- `v.pedido_id`: ID del pedido origen
- `garzon_nombre`: Nombre completo del garzón (solo si viene de pedido)
- `garzon_nick`: Nick del garzón (solo si viene de pedido)

**POST actualizado:**
```typescript
const {
  total,
  detalles,
  cliente_id,
  pedido_id,  // ✅ Nuevo campo
  metodo_pago = 'efectivo',
  propina = 0,
  usuarios = [],
  habitacion_id,
  sub_total,
  total_comision
} = req.body;

const insertVentaSql = `
  INSERT INTO ventas (
    codigo, cliente_id, pedido_id, habitacion_id, metodo_pago, propina, sub_total, total, total_comision
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
`;
```

### 2. Modal de Detalle de Pedido (`components/orders/OrderDetailModal.tsx`)

**Actualización al registrar venta:**
```typescript
const ventaData = {
  cliente_id: pedido.cliente_id || null,
  pedido_id: orderId || null, // ✅ Guardar el ID del pedido
  metodo_pago: metodoPago as 'efectivo' | 'tarjeta' | 'transferencia',
  propina: propina,
  sub_total: sub_total,
  total: (pedido.total || 0) + propina + recargoAnfitrionas,
  detalles: detail.map((item: any) => ({
    producto_id: item.id_producto || item.producto_id,
    precio: item.precio || 0,
    cantidad: item.cantidad || 0,
    comision: item.comision || 0,
    sub_total: (item.precio || 0) * (item.cantidad || 0)
  })),
  usuarios: anfitrionasFinal.map(...),
  habitacion_id: habitacionId ? parseInt(habitacionId) : undefined
};
```

## Flujo de Datos

### Cuando se registra una venta desde un pedido:
1. Usuario abre el modal de detalle de pedido
2. Completa los datos (método de pago, propina, habitación)
3. Hace clic en "Registrar Venta"
4. El sistema guarda:
   - `cliente_id`: Del pedido (puede ser NULL)
   - `pedido_id`: ID del pedido origen
   - Todos los demás datos de la venta
5. Al listar ventas, se muestra el nombre del garzón si viene de un pedido

### Cuando se registra una venta directa (sin pedido):
1. Usuario crea una venta desde el módulo de ventas
2. `pedido_id` se guarda como NULL
3. No se muestra información de garzón

## Visualización en Frontend

En el listado de ventas, ahora se puede mostrar:
- **Cliente**: Nombre del cliente o "Sin cliente registrado"
- **Garzón**: Nombre y nick del garzón (solo si viene de pedido)
- **Habitación**: Nombre de la habitación (si aplica)
- **Anfitrionas**: Nicks de las anfitrionas

## Beneficios

1. **Trazabilidad**: Se puede rastrear el origen de cada venta
2. **Información completa**: Se muestra quién realizó el pedido original
3. **Reportes mejorados**: Permite generar reportes por garzón
4. **Auditoría**: Facilita la auditoría de ventas y pedidos
5. **Flexibilidad**: Ventas pueden existir con o sin pedido asociado

## Compatibilidad

- ✅ Ventas existentes: No se ven afectadas (pedido_id será NULL)
- ✅ Ventas nuevas sin pedido: Funcionan normalmente
- ✅ Ventas desde pedidos: Guardan la relación correctamente
- ✅ Eliminación de pedidos: No afecta las ventas (ON DELETE SET NULL)

## Fecha de Implementación
15 de enero de 2026
