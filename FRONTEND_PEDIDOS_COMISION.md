# Frontend - Pedidos con y sin Comisión

## Resumen de Cambios en el Frontend

Se ha actualizado la interfaz de usuario para permitir que el garzón marque qué productos en un pedido generan comisión (para las chicas) y cuáles no (para el cliente).

## Componentes Modificados

### 1. OrderProductTable.tsx

**Cambios principales:**
- ✅ Agregada columna "TIPO" en la tabla
- ✅ Botón toggle para cambiar entre "Cliente" y "Chicas"
- ✅ Iconos visuales: 👤 Usuario (Cliente) y 🎁 Regalo (Chicas)
- ✅ Colores distintivos:
  - Azul para productos del cliente (sin comisión)
  - Rosa para productos de las chicas (con comisión)
- ✅ Tooltip explicativo al pasar el mouse

**Nuevas props:**
```typescript
interface OrderProductTableProps {
  productos: any[];
  onRemoveProducto?: (index: number) => void;
  onUpdateCantidad?: (index: number, nuevaCantidad: number) => void;
  onToggleComision?: (index: number) => void; // Nueva prop
}
```

**Visualización:**
```
┌──────────┬──────────┬────────┬─────────┬──────────┬──────────┐
│ PRODUCTO │ CANTIDAD │ PRECIO │  TIPO   │ SUBTOTAL │ ELIMINAR │
├──────────┼──────────┼────────┼─────────┼──────────┼──────────┤
│ Cerveza  │    2     │ $10000 │ Cliente │  $20000  │    🗑️    │
│ Whisky   │    3     │ $10000 │ Chicas  │  $30000  │    🗑️    │
└──────────┴──────────┴────────┴─────────┴──────────┴──────────┘
```

### 2. OrderForm.tsx

**Cambios principales:**
- ✅ Agregado campo `generaComision: 1` al agregar productos (por defecto para las chicas)
- ✅ Implementada función `handleToggleComision` para cambiar el tipo
- ✅ Actualizado envío de datos al backend con campo `generaComision`

**Nueva prop:**
```typescript
interface OrderFormProps {
  // ... props existentes
  onToggleComision?: (index: number) => void; // Nueva prop
}
```

**Datos enviados al backend:**
```typescript
const detalles = productos.map((item) => ({
  productoId: Number(item.id_producto || item.id),
  cantidad: Number(item.cantidad),
  precio: Number(item.precio || item.price),
  subtotal: Number(item.subtotal),
  comision: Number(item.comision || 0),
  generaComision: Number(item.generaComision ?? 1), // Nuevo campo
}));
```

### 3. app/orders/new/page.tsx

**Cambios principales:**
- ✅ Implementada función `handleToggleComision` para actualizar el estado
- ✅ Pasada la función al componente OrderForm

**Nueva función:**
```typescript
const handleToggleComision = (index: number) => {
  setProductos((prev: any[]) => 
    prev.map((producto, i) => 
      i === index 
        ? {
            ...producto,
            generaComision: producto.generaComision === 1 ? 0 : 1,
          }
        : producto
    )
  );
};
```

## Flujo de Usuario

### Crear un Pedido

1. **Seleccionar cliente y anfitrionas** (como antes)

2. **Agregar productos:**
   - Click en categoría
   - Seleccionar producto
   - Por defecto se marca como "Chicas" (con comisión)

3. **Cambiar tipo de producto:**
   - Click en el botón "Chicas" o "Cliente"
   - El botón cambia de color y texto:
     - 🎁 **Chicas** (Rosa) → Genera comisión
     - 👤 **Cliente** (Azul) → No genera comisión

4. **Ajustar cantidades** (como antes)

5. **Enviar pedido:**
   - El backend recibe el campo `generaComision` para cada producto
   - Solo los productos con `generaComision: 1` generan comisión

## Ejemplo Visual

### Tabla de Productos

```
┌─────────────────────────────────────────────────────────────────┐
│                      DETALLES PRODUCTO                          │
├──────────┬──────────┬────────┬─────────────┬──────────┬────────┤
│ PRODUCTO │ CANTIDAD │ PRECIO │    TIPO     │ SUBTOTAL │ ACCIÓN │
├──────────┼──────────┼────────┼─────────────┼──────────┼────────┤
│ Cerveza  │  [-] 2 [+]│ $10000 │ [👤 Cliente]│  $20000  │   🗑️   │
│          │          │        │   (Azul)    │          │        │
├──────────┼──────────┼────────┼─────────────┼──────────┼────────┤
│ Whisky   │  [-] 3 [+]│ $10000 │ [🎁 Chicas] │  $30000  │   🗑️   │
│          │          │        │   (Rosa)    │          │        │
└──────────┴──────────┴────────┴─────────────┴──────────┴────────┘
```

### Botón Toggle

**Estado 1: Para las Chicas (con comisión)**
```
┌─────────────────┐
│ 🎁 Chicas       │  ← Rosa/Pink
└─────────────────┘
Tooltip: "Para las chicas (con comisión)"
```

**Estado 2: Para el Cliente (sin comisión)**
```
┌─────────────────┐
│ 👤 Cliente      │  ← Azul/Blue
└─────────────────┘
Tooltip: "Para el cliente (sin comisión)"
```

## Estilos CSS

### Botón "Chicas" (con comisión)
```css
bg-pink-100 text-pink-700 border-pink-300 hover:bg-pink-200
```

### Botón "Cliente" (sin comisión)
```css
bg-blue-100 text-blue-700 border-blue-300 hover:bg-blue-200
```

## Datos del Producto

Cada producto en el array ahora incluye:

```typescript
{
  id_producto: number,
  nombre: string,
  precio: number,
  cantidad: number,
  subtotal: number,
  comision: number,
  generaComision: 0 | 1,  // Nuevo campo
  // 0 = Para el cliente (sin comisión)
  // 1 = Para las chicas (con comisión)
}
```

## Archivos Modificados

- ✅ `components/orders/OrderProductTable.tsx` - Tabla con columna TIPO y toggle
- ✅ `components/orders/OrderForm.tsx` - Lógica de toggle y envío de datos
- ✅ `app/orders/new/page.tsx` - Handler de toggle en el estado

## Próximos Pasos

1. ✅ Ejecutar migración SQL en la base de datos
2. ✅ Actualizar backend (completado)
3. ✅ Actualizar frontend (completado)
4. ⏳ Probar flujo completo de crear pedido
5. ⏳ Actualizar componente de detalle de pedido para mostrar el tipo
6. ⏳ Capacitar al personal sobre la nueva funcionalidad

## Notas Importantes

- **Por defecto:** Todos los productos se agregan como "Chicas" (generan comisión)
- **Cambio fácil:** Un click en el botón cambia el tipo
- **Visual claro:** Colores distintivos para identificar rápidamente el tipo
- **Tooltip:** Ayuda contextual al pasar el mouse
- **Compatibilidad:** Los pedidos antiguos siguen funcionando (todos con comisión)

---

**Fecha de implementación**: 15 de enero de 2026
**Estado**: ✅ Completado - Listo para pruebas
