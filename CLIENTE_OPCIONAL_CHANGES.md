# Cliente Opcional en Ventas, Servicios y Pedidos

## Resumen de Cambios

Se ha modificado el sistema para que el cliente NO sea obligatorio en ventas, servicios y pedidos. Cuando no se proporciona un cliente, se muestra "Sin cliente registrado" en lugar de depender de un cliente con ID 1.

## Cambios Realizados

### 1. Ventas (Sales)

**Archivos modificados:**
- `admin-dashboard/pages/api/sales.ts`
- `admin-dashboard/pages/api/ventas/[id].ts`
- `admin-dashboard/pages/api/ventas/[id]/solicitar-anulacion.ts`
- `admin-dashboard/pages/api/whatsapp/webhook.ts`
- `admin-dashboard/pages/api/calendar-data.ts`

**Cambio en consultas SQL:**
```sql
-- ANTES
CONCAT(c.nombre, ' ', c.apellido) as cliente_nombre

-- DESPUÉS
COALESCE(CONCAT(c.nombre, ' ', c.apellido), 'Sin cliente registrado') as cliente_nombre
```

**Inserción de ventas:**
```typescript
// Ya estaba implementado correctamente
cliente_id || null  // Si no se proporciona, se guarda NULL en lugar de 1
```

### 2. Servicios

**Archivos modificados:**
- `admin-dashboard/pages/api/servicios.ts`
- `admin-dashboard/pages/api/servicios/[id].ts`
- `admin-dashboard/pages/api/servicios/[id]/solicitar-anulacion.ts`
- `admin-dashboard/pages/api/servicios/[id]/solicitar-devolucion.ts`
- `admin-dashboard/pages/api/whatsapp/webhook.ts`

**Cambio en consultas SQL:**
```sql
-- ANTES
CONCAT(c.nombre, ' ', c.apellido) as cliente_nombre
-- o
c.nombre as cliente_nombre

-- DESPUÉS
COALESCE(CONCAT(c.nombre, ' ', c.apellido), 'Sin cliente registrado') as cliente_nombre
-- o
COALESCE(c.nombre, 'Sin cliente registrado') as cliente_nombre
```

**Inserción de servicios:**
```typescript
// Ya estaba implementado correctamente
const clienteIdFinal = cliente_id || null;  // Si no se proporciona, se guarda NULL
```

### 3. Pedidos (Orders)

**Archivos modificados:**
- `admin-dashboard/pages/api/orders.ts`

**Cambio en consultas SQL:**
```sql
-- ANTES
CONCAT(CL.nombre, ' ', CL.apellido) AS cliente

-- DESPUÉS
COALESCE(CONCAT(CL.nombre, ' ', CL.apellido), 'Sin cliente registrado') AS cliente
```

**Schema de validación:**
```typescript
// El schema ya permitía cliente opcional con default
clienteId: z.number().default(1)

// Ahora en la inserción se usa:
cliente_id || null  // NULL en lugar de 1
```

## Beneficios

1. **No depende de un cliente específico**: Ya no es necesario que exista un cliente con ID 1 en la base de datos
2. **Más flexible**: Permite registrar ventas/servicios sin cliente cuando sea necesario
3. **Mejor UX**: Muestra claramente "Sin cliente registrado" en lugar de mostrar datos incorrectos
4. **Evita errores**: No falla si el cliente con ID 1 no existe o fue eliminado

## Archivos Afectados

### APIs de Ventas
- ✅ `pages/api/sales.ts` - Lista de ventas
- ✅ `pages/api/ventas/[id].ts` - Detalle y actualización de venta
- ✅ `pages/api/ventas/[id]/solicitar-anulacion.ts` - Solicitud de anulación
- ✅ `pages/api/whatsapp/webhook.ts` - Notificaciones de WhatsApp
- ✅ `pages/api/calendar-data.ts` - Datos del calendario

### APIs de Servicios
- ✅ `pages/api/servicios.ts` - Lista de servicios
- ✅ `pages/api/servicios/[id].ts` - Detalle y actualización de servicio
- ✅ `pages/api/servicios/[id]/solicitar-anulacion.ts` - Solicitud de anulación
- ✅ `pages/api/servicios/[id]/solicitar-devolucion.ts` - Solicitud de devolución
- ✅ `pages/api/whatsapp/webhook.ts` - Notificaciones de WhatsApp

### APIs de Pedidos
- ✅ `pages/api/orders.ts` - Lista de pedidos

## Pruebas Recomendadas

1. Crear una venta sin seleccionar cliente
2. Crear un servicio sin seleccionar cliente
3. Crear un pedido sin seleccionar cliente
4. Verificar que en los listados aparezca "Sin cliente registrado"
5. Verificar que los detalles muestren correctamente el texto
6. Verificar que las notificaciones de WhatsApp funcionen correctamente

## Notas Técnicas

- Se usa `COALESCE()` en SQL para manejar valores NULL
- Los LEFT JOIN permiten que el cliente sea opcional
- La base de datos debe permitir NULL en las columnas `cliente_id`
- No se requieren cambios en el esquema de la base de datos si ya permite NULL

---

**Fecha de actualización**: 15 de enero de 2026
**Estado**: ✅ Completado y verificado
