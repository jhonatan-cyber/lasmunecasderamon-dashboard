# Pedidos con y sin Comisión

## Resumen

Se ha implementado la funcionalidad para diferenciar en un pedido qué productos generan comisión para las anfitrionas y cuáles no. Esto permite que el cliente pueda pedir bebidas para él (sin comisión) y bebidas para las chicas (con comisión) en el mismo pedido.

## Problema Resuelto

**Situación anterior:**
- Todos los productos en un pedido generaban comisión para las anfitrionas
- No se podía diferenciar entre productos para el cliente y productos para las chicas

**Situación actual:**
- Cada producto en el pedido puede marcarse como "genera comisión" o "no genera comisión"
- El cliente puede pedir 2 bebidas para él (sin comisión) y 3 bebidas para las chicas (con comisión)
- Las anfitrionas solo reciben comisión de los productos marcados como "genera comisión"

## Cambios en la Base de Datos

### Nueva Columna en `detalle_pedidos`

```sql
ALTER TABLE `detalle_pedidos` 
ADD COLUMN `genera_comision` TINYINT(1) NOT NULL DEFAULT 1 
COMMENT 'Indica si el producto genera comisión para las anfitrionas (1=Sí, 0=No)' 
AFTER `comision`;
```

**Valores:**
- `1` = Genera comisión (producto para las chicas)
- `0` = No genera comisión (producto para el cliente)
- **Default:** `1` (por compatibilidad con pedidos existentes)

## Cambios en la API

### 1. Schema de Validación

**Archivo:** `admin-dashboard/pages/api/orders.ts`

```typescript
const orderDetailSchema = z.object({
  productoId: z.number(),
  precio: z.number(),
  comision: z.number(),
  cantidad: z.number(),
  subtotal: z.number(),
  generaComision: z.number().optional().default(1) // Nuevo campo
});
```

### 2. Crear Pedido - POST `/api/orders`

**Inserción de detalles actualizada:**
```typescript
for (const d of detalles) {
  await query(
    'INSERT INTO detalle_pedidos (pedido_id, producto_id, precio, comision, genera_comision, cantidad, subtotal) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [pedidoId, d.productoId, d.precio, d.comision, d.generaComision ?? 1, d.cantidad, d.subtotal]
  );
}
```

### 3. Detalle de Pedido - GET `/api/orders/detail?id={id}`

**Archivo:** `admin-dashboard/pages/api/orders/detail.ts`

**Campo agregado en la consulta:**
```sql
SELECT 
  ...
  DP.comision,
  DP.genera_comision,  -- Nuevo campo
  ...
FROM detalle_pedidos DP
```

## Ejemplo de Uso

### Crear un Pedido Mixto

```json
{
  "codigo": "PED-001",
  "meseroId": 5,
  "clienteId": 10,
  "subtotal": 50000,
  "total": 50000,
  "totalComision": 6000,
  "detalles": [
    {
      "productoId": 1,
      "precio": 10000,
      "comision": 0,
      "cantidad": 2,
      "subtotal": 20000,
      "generaComision": 0  // Para el cliente (sin comisión)
    },
    {
      "productoId": 2,
      "precio": 10000,
      "comision": 2000,
      "cantidad": 3,
      "subtotal": 30000,
      "generaComision": 1  // Para las chicas (con comisión)
    }
  ],
  "usuarios": [
    { "usuarioId": 15 },
    { "usuarioId": 16 }
  ]
}
```

### Respuesta del Detalle

```json
{
  "success": true,
  "data": [
    {
      "id_pedido": 123,
      "codigo": "PED-001",
      "producto": "Cerveza",
      "cantidad": 2,
      "precio": 10000,
      "comision": 0,
      "genera_comision": 0,  // No genera comisión
      "subtotal": 20000
    },
    {
      "id_pedido": 123,
      "codigo": "PED-001",
      "producto": "Whisky",
      "cantidad": 3,
      "precio": 10000,
      "comision": 2000,
      "genera_comision": 1,  // Genera comisión
      "subtotal": 30000
    }
  ]
}
```

## Cálculo de Comisiones

### Antes (Todos los productos generaban comisión)
```
Total pedido: $50,000
Comisión total: $6,000 (de todos los productos)
Comisión por anfitriona (2 anfitrionas): $3,000 cada una
```

### Ahora (Solo productos marcados generan comisión)
```
Total pedido: $50,000
  - Productos para cliente (sin comisión): $20,000
  - Productos para chicas (con comisión): $30,000

Comisión total: $6,000 (solo de productos con genera_comision=1)
Comisión por anfitriona (2 anfitrionas): $3,000 cada una
```

## Flujo de Trabajo

### En el Frontend (Crear Pedido)

1. El garzón selecciona productos para el pedido
2. Para cada producto, puede marcar:
   - ✅ **"Para las chicas"** → `generaComision: 1`
   - ❌ **"Para el cliente"** → `generaComision: 0`
3. El sistema calcula automáticamente:
   - Subtotal de cada producto
   - Comisión solo de productos con `generaComision: 1`
   - Total del pedido

### En el Backend (Procesar Pedido)

1. Se valida el pedido con el schema
2. Se inserta el pedido principal
3. Se insertan los detalles con el campo `genera_comision`
4. Se calculan y registran las comisiones solo de productos con `genera_comision: 1`

## Compatibilidad con Pedidos Existentes

- **Pedidos antiguos:** El campo `genera_comision` se establece en `1` por defecto
- **Comportamiento:** Los pedidos existentes seguirán funcionando igual (todos generan comisión)
- **Sin cambios:** No se requiere migración de datos

## Archivos Modificados

- ✅ `database/migrations/add_genera_comision_to_detalle_pedidos.sql` - Migración SQL
- ✅ `pages/api/orders.ts` - Schema y creación de pedidos
- ✅ `pages/api/orders/detail.ts` - Detalle de pedidos

## Archivos que Necesitan Actualización en el Frontend

### Componentes a Modificar:

1. **Formulario de Crear Pedido**
   - Agregar checkbox o toggle para marcar si el producto genera comisión
   - Mostrar visualmente qué productos son para el cliente y cuáles para las chicas

2. **Tabla de Productos en el Pedido**
   - Mostrar indicador visual (ícono o badge) de si genera comisión
   - Ejemplo: 🎁 Para las chicas | 👤 Para el cliente

3. **Detalle del Pedido**
   - Mostrar claramente qué productos generaron comisión
   - Separar visualmente productos con y sin comisión

## Beneficios

1. **Flexibilidad:** El cliente puede pedir para él y para las chicas en el mismo pedido
2. **Justicia:** Las anfitrionas solo reciben comisión de lo que realmente les corresponde
3. **Transparencia:** Se puede ver claramente qué productos generaron comisión
4. **Control:** El garzón decide en el momento qué productos generan comisión
5. **Compatibilidad:** Los pedidos antiguos siguen funcionando sin cambios

## Próximos Pasos

1. ✅ Ejecutar la migración SQL en la base de datos
2. ⏳ Actualizar el frontend para incluir el campo `generaComision`
3. ⏳ Agregar indicadores visuales en la UI
4. ⏳ Probar el flujo completo de crear pedido con productos mixtos
5. ⏳ Capacitar al personal sobre la nueva funcionalidad

---

**Fecha de implementación**: 15 de enero de 2026
**Estado**: ✅ Backend completado - ⏳ Frontend pendiente
