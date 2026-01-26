# Asignación de Anfitrionas para Champañas y Bebidas con Comisión

## Descripción

Esta funcionalidad permite manejar la asignación específica de anfitrionas para diferentes tipos de productos en los pedidos:

1. **Champañas**: Permiten seleccionar múltiples anfitrionas de las ya definidas en el select principal
2. **Bebidas con comisión**: Permiten seleccionar una anfitriona específica, excluyendo las ya asignadas a champañas

## Configuración Inicial

### 1. Crear la tabla en la base de datos

Ejecuta el siguiente script para crear la tabla necesaria:

```bash
cd admin-dashboard
node scripts/create-champagne-hostess-table.js
```

O ejecuta manualmente el SQL:

```sql
CREATE TABLE IF NOT EXISTS detalle_pedidos_anfitrionas (
  id_detalle_anfitriona INT AUTO_INCREMENT PRIMARY KEY,
  detalle_pedido_id INT NOT NULL,
  anfitriona_id INT NOT NULL,
  fecha_crea TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (detalle_pedido_id) REFERENCES detalle_pedidos(id_detalle_pedido) ON DELETE CASCADE,
  FOREIGN KEY (anfitriona_id) REFERENCES usuarios(id_usuario) ON DELETE CASCADE,
  UNIQUE KEY unique_detalle_anfitriona (detalle_pedido_id, anfitriona_id)
);
```

## Cómo Funciona

### Flujo de Creación de Pedidos

1. **Selección de Anfitrionas Principal**: El usuario selecciona las anfitrionas disponibles para el pedido
2. **Selección de Productos**: Al agregar productos desde las categorías:
   - **Para Champañas**: Se muestra un selector múltiple con las anfitrionas ya seleccionadas
   - **Para Bebidas con Comisión**: Se muestra un selector individual excluyendo las anfitrionas asignadas a champañas
3. **Validaciones**: El sistema valida que no haya conflictos entre asignaciones

### Reglas de Negocio

#### Champañas
- Pueden tener múltiples anfitrionas asignadas
- Solo pueden seleccionar de las anfitrionas ya elegidas en el selector principal
- La comisión se reparte entre las anfitrionas asignadas específicamente

#### Bebidas con Comisión (No Champañas)
- Solo pueden tener una anfitriona asignada
- No pueden seleccionar anfitrionas ya asignadas a champañas
- Si no se asigna anfitriona específica, la comisión se reparte entre todas las anfitrionas del pedido

#### Validaciones
- Las anfitrionas asignadas deben estar en la lista principal seleccionada
- No puede haber conflictos entre asignaciones de champañas y bebidas
- Se respetan los límites de anfitrionas según el precio de las champañas

## Estructura de Datos

### Tabla `detalle_pedidos_anfitrionas`
```sql
- id_detalle_anfitriona: ID único de la asignación
- detalle_pedido_id: Referencia al detalle del pedido
- anfitriona_id: ID de la anfitriona asignada
- fecha_crea: Timestamp de creación
```

### Campos Adicionales en el Frontend
```typescript
interface ProductoConAnfitrionas {
  selectedHostesses: string[]; // IDs de anfitrionas asignadas
  isChampagne: boolean; // Si es champaña
  // ... otros campos existentes
}
```

## API Changes

### POST /api/orders
Ahora acepta en los detalles:
```typescript
{
  selectedHostesses: string[]; // Para champañas con múltiples anfitrionas
  hostessId: number | null; // Para bebidas individuales (mantiene compatibilidad)
}
```

### GET /api/orders/detail
Retorna información adicional:
```typescript
{
  anfitrionas_asignadas: string; // Nombres concatenados
  anfitrionas_asignadas_ids: string; // IDs concatenados
}
```

## Componentes Modificados

1. **CategoryProductsModal**: Agregada columna de selección de anfitrionas
2. **OrderForm**: Manejo de estados de selección de anfitrionas
3. **OrderProductTable**: Visualización mejorada de asignaciones
4. **API orders.ts**: Soporte para múltiples asignaciones
5. **API orders/detail.ts**: Consultas extendidas

## Casos de Uso

### Caso 1: Pedido Solo con Champañas
1. Seleccionar 3 anfitrionas en el selector principal
2. Agregar champaña de $200,000 (permite hasta 4 anfitrionas)
3. En el modal, seleccionar 2 de las 3 anfitrionas para la champaña
4. La comisión se reparte solo entre las 2 seleccionadas

### Caso 2: Pedido Mixto (Champaña + Bebidas)
1. Seleccionar 4 anfitrionas en el selector principal
2. Agregar champaña y asignar 2 anfitrionas específicas
3. Agregar bebida con comisión y asignar 1 de las 2 anfitrionas restantes
4. Las comisiones se manejan por separado según las asignaciones

### Caso 3: Pedido Solo con Bebidas con Comisión
1. Seleccionar anfitrionas según cantidad de bebidas
2. Cada bebida puede tener una anfitriona específica o repartirse entre todas
3. No se permite duplicar asignaciones individuales

## Troubleshooting

### Error: Tabla no existe
Si aparece error de tabla no encontrada, ejecuta:
```bash
node scripts/create-champagne-hostess-table.js
```

### Error: Anfitrionas no disponibles
Verifica que:
1. Las anfitrionas estén seleccionadas en el selector principal
2. No haya conflictos entre asignaciones de champañas y bebidas
3. Se respeten los límites según el precio de las champañas

### Error: Validación de límites
El sistema calcula automáticamente los límites:
- Champaña ≥$240k = 5 anfitrionas
- Champaña ≥$200k = 4 anfitrionas  
- Champaña ≥$160k = 3 anfitrionas
- Champaña ≥$120k = 2 anfitrionas
- Champaña <$120k = 1 anfitriona

## Compatibilidad

La nueva funcionalidad es completamente compatible con pedidos existentes:
- Pedidos antiguos siguen funcionando normalmente
- La tabla nueva es opcional y se crea automáticamente si no existe
- Las consultas manejan casos donde no hay asignaciones específicas