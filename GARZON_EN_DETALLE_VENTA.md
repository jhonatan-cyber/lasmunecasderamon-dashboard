# Mostrar Garzón en Detalle de Venta

## Resumen
Se agregó la visualización del nombre y apellido del garzón en el detalle de venta, pero solo cuando la venta proviene de un pedido.

## Cambios Realizados

### 1. Backend - API de Detalle de Venta (`pages/api/ventas/[id].ts`)

**Consulta actualizada:**
```typescript
const ventaSql = `
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
`;
```

**Lógica:**
- Si `v.pedido_id IS NOT NULL` → Muestra nombre completo y nick del garzón
- Si `v.pedido_id IS NULL` → Devuelve NULL (no muestra información)

### 2. Frontend - Modal de Detalle (`components/sales/SalesDetailModal.tsx`)

**Nuevo campo agregado:**
```tsx
{selectedVenta.garzon_nombre && (
  <div className="flex items-center gap-2">
    <User className="text-gray-500 w-3 h-3 sm:w-4 sm:h-4" />
    <Label className="text-xs sm:text-sm font-medium">Garzón:</Label>
    <span className="text-xs sm:text-sm">
      {selectedVenta.garzon_nombre}
    </span>
  </div>
)}
```

**Posición:**
- Se muestra después del campo "Cliente"
- Solo se renderiza si `garzon_nombre` tiene valor (condicional)

### 3. Tipos de Datos (`types/venta.ts`)

**Interfaces actualizadas:**

```typescript
export interface Venta {
  id: number;
  codigo: string;
  cliente_id: number;
  pedido_id?: number | null; // ✅ Nuevo campo
  habitacion_id: number;
  metodo_pago: 'efectivo' | 'tarjeta' | 'transferencia';
  propina: number;
  sub_total: number;
  total: number;
  fecha_crea: string;
  fecha_mod?: string;
  estado: number;
}

export interface VentaWithDetails extends Venta {
  detalles: VentaDetalle[];
  usuarios: VentaUsuario[];
  cliente_nombre?: string;
  habitacion_numero?: string;
  usuarios_nombres?: string[];
  garzon_nombre?: string | null; // ✅ Nuevo campo
  garzon_nick?: string | null;   // ✅ Nuevo campo
}

export interface VentaCreate {
  cliente_id: number;
  pedido_id?: number | null; // ✅ Nuevo campo
  habitacion_id?: number;
  metodo_pago: 'efectivo' | 'tarjeta' | 'transferencia';
  propina: number;
  sub_total: number;
  total: number;
  detalles: VentaDetalleCreate[];
  usuarios?: number[];
}
```

## Flujo de Visualización

### Caso 1: Venta desde Pedido
1. Usuario abre detalle de venta
2. Backend verifica si `pedido_id IS NOT NULL`
3. Si existe, hace JOIN con `pedidos` y `usuarios` para obtener datos del garzón
4. Frontend muestra el campo "Garzón" con el nombre completo

**Ejemplo de visualización:**
```
Cliente: Juan Pérez
Garzón: Carlos Rodríguez  ← Se muestra
Habitación: Habitación 1
```

### Caso 2: Venta Directa (sin pedido)
1. Usuario abre detalle de venta
2. Backend verifica si `pedido_id IS NULL`
3. Devuelve `garzon_nombre: null` y `garzon_nick: null`
4. Frontend NO muestra el campo "Garzón" (condicional)

**Ejemplo de visualización:**
```
Cliente: María González
                         ← No se muestra garzón
Habitación: Sin habitación
```

## Beneficios

1. **Trazabilidad**: Se puede identificar quién realizó el pedido original
2. **Información contextual**: Útil para auditorías y reportes
3. **UI limpia**: Solo se muestra cuando es relevante
4. **Consistencia**: Mismo patrón usado en listado de ventas

## Compatibilidad

- ✅ Ventas existentes sin pedido: No muestran garzón
- ✅ Ventas desde pedidos: Muestran garzón correctamente
- ✅ Responsive: Se adapta a diferentes tamaños de pantalla
- ✅ TypeScript: Tipos actualizados para evitar errores

## Archivos Modificados

1. `pages/api/ventas/[id].ts` - Backend con JOINs
2. `components/sales/SalesDetailModal.tsx` - UI con campo condicional
3. `types/venta.ts` - Tipos actualizados

## Fecha de Implementación
15 de enero de 2026
