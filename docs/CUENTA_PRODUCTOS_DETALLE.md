# Detalle de Productos en Cuenta

## Descripción
La funcionalidad de "ver detalle de cuenta" incluye una sección completa que muestra todos los productos asociados a esa cuenta, con información detallada de cada producto.

## Características de la Sección de Productos

### 1. **Tabla de Productos**
- **Ubicación**: En el modal `CuentaDetailModal.tsx`
- **Sección**: "Detalle de Productos"
- **Columnas mostradas**:
  - **PRODUCTO**: Nombre del producto
  - **CANTIDAD**: Cantidad del producto
  - **PRECIO**: Precio unitario
  - **SUB TOTAL**: Subtotal del producto (precio × cantidad)
  - **COMISIÓN**: Comisión asociada al producto
  - **ANFITRIONAS**: Anfitrionas asociadas al producto

### 2. **Información Mostrada por Producto**

#### Nombre del Producto
- Muestra el nombre real del producto si está disponible
- Si no hay nombre, muestra "Producto ID: [número]"
- Si no hay datos, muestra "Producto sin nombre"

#### Cantidad
- Número de unidades del producto
- Se muestra centrado en la tabla

#### Precio
- Precio unitario del producto
- Formato de moneda sin decimales
- Alineado a la derecha

#### Sub Total
- Cálculo: precio × cantidad
- Formato de moneda sin decimales
- Alineado a la derecha

#### Comisión
- Comisión asociada al producto
- Formato de moneda sin decimales
- Alineado a la derecha

#### Anfitrionas
- Lista de anfitrionas asociadas al producto
- Se muestra en color púrpura para destacar
- Si no hay anfitrionas, muestra "Sin anfitrionas" en gris
- Múltiples anfitrionas se separan por comas

### 3. **Fila de Resumen**
Al final de la tabla se muestra una fila de resumen que incluye:
- **Total de productos**: Número de productos diferentes
- **Subtotal general**: Suma de todos los subtotales
- **Comisión total**: Suma de todas las comisiones

### 4. **Estados de Visualización**

#### Con Productos
- Muestra la tabla completa con todos los productos
- Incluye fila de resumen con totales
- Colores diferenciados para subtotales (azul) y comisiones (naranja)

#### Sin Productos
- Muestra mensaje: "No hay productos registrados en esta cuenta"
- Fondo gris claro para destacar el mensaje
- Centrado en la sección

## Datos de Prueba

### Ejemplo de Productos en Cuenta
```json
{
  "detalles": [
    {
      "precio": 25000,
      "cantidad": 2,
      "sub_total": 50000,
      "comision": 5000,
      "fecha_crea": "2025-01-15 14:30:00",
      "anfitrionaId": "1, 2",
      "anfitrionas": "maria_gonzalez, carlos_rodriguez",
      "producto": "Champaña Dom Pérignon",
      "id_producto": 1
    },
    {
      "precio": 15000,
      "cantidad": 1,
      "sub_total": 15000,
      "comision": 3000,
      "fecha_crea": "2025-01-15 14:30:00",
      "anfitrionaId": "1",
      "anfitrionas": "maria_gonzalez",
      "producto": "Whisky Johnnie Walker Blue",
      "id_producto": 2
    },
    {
      "precio": 2000,
      "cantidad": 5,
      "sub_total": 10000,
      "comision": 2000,
      "fecha_crea": "2025-01-15 14:30:00",
      "anfitrionaId": "2",
      "anfitrionas": "carlos_rodriguez",
      "producto": "Hielo Premium",
      "id_producto": 3
    },
    {
      "precio": 5000,
      "cantidad": 1,
      "sub_total": 5000,
      "comision": 5000,
      "fecha_crea": "2025-01-15 14:30:00",
      "anfitrionaId": "1, 2",
      "anfitrionas": "maria_gonzalez, carlos_rodriguez",
      "producto": "Servicio de Garzón",
      "id_producto": 4
    }
  ]
}
```

## Endpoint API

### GET /api/cuentas/[id]
El endpoint devuelve los detalles de productos con anfitrionas usando la siguiente consulta:

```sql
SELECT 
    DC.precio, 
    DC.cantidad, 
    DC.sub_total, 
    DC.comision, 
    DC.fecha_crea,
    GROUP_CONCAT(U.id_usuario SEPARATOR ', ') AS anfitrionaId, 
    GROUP_CONCAT(U.nick SEPARATOR ', ') AS anfitrionas,
    PR.nombre AS producto, 
    PR.id_producto
FROM detalle_cuentas DC 
LEFT JOIN productos PR ON PR.id_producto = DC.producto_id
LEFT JOIN cuentas_usuarios CU ON CU.cuenta_id = DC.cuenta_id
LEFT JOIN usuarios U ON U.id_usuario = CU.usuario_id
WHERE DC.cuenta_id = ?
GROUP BY DC.precio, DC.cantidad, DC.sub_total, DC.comision, DC.fecha_crea, PR.nombre, PR.id_producto
```

## Cálculos Automáticos

### Sub Total por Producto
```javascript
sub_total = precio × cantidad
```

### Totales Generales
```javascript
subtotal_general = detalles.reduce((sum, detalle) => sum + detalle.sub_total, 0)
comision_total = detalles.reduce((sum, detalle) => sum + detalle.comision, 0)
```

## Estilos y UX

### Diseño de la Tabla
- **Header**: Fondo gris claro con texto centrado
- **Filas de productos**: Fondo blanco con hover gris
- **Fila de resumen**: Fondo gris con texto en negrita
- **Colores**: Azul para subtotales, naranja para comisiones

### Responsividad
- Tabla con scroll horizontal en pantallas pequeñas
- Columnas ajustadas al contenido
- Texto centrado para cantidades, alineado a la derecha para valores monetarios

## Integración con el Sistema

### Relación con Productos
- Los productos se obtienen de la tabla `productos`
- Se hace JOIN con `detalle_cuentas` para obtener la información de la cuenta
- Si no existe el producto, se muestra el ID como fallback

### Relación con Cuentas
- Cada cuenta puede tener múltiples productos
- Los productos se almacenan en `detalle_cuentas`
- Cada detalle incluye precio, cantidad, subtotal y comisión

## Próximas Mejoras

1. **Filtros de productos**: Filtrar por categoría o precio
2. **Ordenamiento**: Ordenar por nombre, precio, cantidad
3. **Búsqueda**: Buscar productos específicos
4. **Exportación**: Exportar lista de productos a PDF
5. **Edición**: Modificar cantidades o productos desde el modal
6. **Imágenes**: Mostrar imágenes de los productos
7. **Categorías**: Agrupar productos por categoría
8. **Estadísticas**: Mostrar estadísticas de productos más vendidos 