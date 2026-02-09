# Feature: Selección de Habitación en Pedidos

## Descripción
Esta funcionalidad permite seleccionar una habitación disponible cuando se agrega un producto con precio mayor o igual a $30,000 y que tenga comisión asignada. Además, para bebidas de precio ≥ $30,000, se permite seleccionar múltiples anfitrionas (hasta el mismo número que la cantidad de tragos).

## Cambios Realizados

### 1. Frontend - Componentes

#### CategoryProductsModal.tsx
- **Nueva columna**: Se agregó la columna "HABITACIÓN" en la tabla de productos
- **Selector de habitación**: Se integró el componente `RoomSelect` para seleccionar habitaciones disponibles (opcional)
- **Selector múltiple de anfitrionas**: Para bebidas ≥ $30,000, se usa `HostessMultiSelect` permitiendo seleccionar hasta el mismo número de anfitrionas que la cantidad de tragos
- **Selector individual de anfitrionas**: Para bebidas < $30,000, se mantiene el selector individual
- **Indicadores visuales**:
  - ✓ Habitación asignada (verde)
  - No requerida (gris)
- **Reglas de negocio**: 
  - Solo se muestran habitaciones con estado = 1 (disponibles) y comisión = 0 (sin comisión)
  - La habitación es completamente opcional

#### OrderForm.tsx
- **Sin validación de habitación**: La habitación es opcional, no se requiere para generar el pedido
- **Validación de anfitrionas**: Se valida que las bebidas no-champaña no excedan el límite de anfitrionas según su cantidad
- **Gestión de estado**: Se agregaron estados para manejar las selecciones de habitación por producto

#### OrderProductTable.tsx
- **Columna de habitación**: Se muestra la habitación asignada a cada producto en la tabla de resumen
- **Badge visual**: Se usa un badge naranja para identificar fácilmente las habitaciones asignadas

### 2. Backend - API

#### pages/api/orders.ts
- **Schema actualizado**: Se agregó `roomId` al esquema de validación `orderDetailSchema`
- **Migración automática**: El endpoint intenta agregar la columna `habitacion_id` automáticamente si no existe
- **Inserción de datos**: Se guarda el `habitacion_id` en la tabla `detalle_pedidos` al crear un pedido

#### pages/api/orders/detail.ts
- **Consulta actualizada**: Se agregó `DP.habitacion_id` en las consultas SQL para devolver la información de la habitación
- **Pre-selección**: El cajero/administrador ve la habitación que seleccionó el garzón automáticamente

### 3. Base de Datos

#### Migración SQL
Se creó el archivo `migrations/add_habitacion_to_detalle_pedidos.sql` con:
- Creación de la columna `habitacion_id` en la tabla `detalle_pedidos`
- Índice para mejorar el rendimiento
- Clave foránea para mantener integridad referencial
- Comentario descriptivo de la columna

## Flujo de Usuario

1. **Seleccionar categoría**: El usuario selecciona una categoría de productos
2. **Ver productos**: Se muestra la lista de productos con sus precios y comisiones
3. **Seleccionar anfitrionas**:
   - **Champañas**: Múltiples anfitrionas según precio
   - **Bebidas ≥ $30,000**: Hasta el mismo número de anfitrionas que la cantidad de tragos (ej: 6 whiskys = hasta 6 anfitrionas)
   - **Bebidas < $30,000**: Una anfitriona por bebida
4. **Seleccionar habitación (opcional)**: Si el producto tiene precio ≥ $30,000 y comisión, aparece el selector de habitación
5. **Agregar al carrito**: El botón "Agregar" se habilita cuando se han seleccionado las anfitrionas requeridas
6. **Generar pedido**: Se puede generar el pedido con o sin habitación asignada
7. **Procesamiento**: El cajero o administrador recibe el pedido con la información de la habitación (si fue seleccionada) ya pre-seleccionada

## Reglas de Negocio

### Selección de Anfitrionas:

#### Champañas:
- Límite según precio:
  - ≥ $240,000: hasta 5 anfitrionas
  - ≥ $200,000: hasta 4 anfitrionas
  - ≥ $140,000: hasta 3 anfitrionas
  - ≥ $120,000: hasta 2 anfitrionas
  - < $120,000: 1 anfitriona

#### Bebidas ≥ $30,000 (no champaña):
- Hasta el mismo número de anfitrionas que la cantidad de tragos
- Ejemplo: 6 whiskys = hasta 6 anfitrionas

#### Bebidas < $30,000:
- Una anfitriona por bebida

### Selección de Habitación:
- **Opcional**: No es obligatorio seleccionar habitación
- **Disponibilidad**: Solo se muestran habitaciones con estado = 1 (disponibles)
- **Sin comisión**: Solo habitaciones con comisión = 0 o NULL
- **Cuándo aparece**: Para productos con precio ≥ $30,000 y comisión > 0

### Validaciones:
1. Se debe seleccionar al menos una anfitriona para productos con comisión
2. No se puede exceder el límite de anfitrionas según el tipo de producto
3. La habitación es completamente opcional

## Mensajes de Error

- **"La bebida [nombre] debe tener al menos una anfitriona asignada"**: Se muestra cuando se intenta generar un pedido sin asignar anfitriona a un producto que la requiere
- **"La bebida [nombre] puede tener máximo [N] anfitriona(s) (según su cantidad)"**: Se muestra cuando se excede el límite de anfitrionas para bebidas no-champaña

## Integración con Sistema Existente

Esta funcionalidad se integra perfectamente con:
- Sistema de asignación de anfitrionas
- Sistema de comisiones
- Sistema de validación de pedidos
- Notificaciones en tiempo real
- Pre-selección de habitación en el modal del cajero/administrador

## Notas Técnicas

- La columna `habitacion_id` acepta valores NULL para productos que no tienen habitación asignada
- Se usa `ON DELETE SET NULL` para evitar errores si se elimina una habitación
- El índice `idx_detalle_pedidos_habitacion` mejora el rendimiento de consultas
- La migración es idempotente (se puede ejecutar múltiples veces sin errores)
- Para bebidas ≥ $30,000, se usa `HostessMultiSelect` con límite dinámico según cantidad
- Para bebidas < $30,000, se usa `IndividualHostessSelect` para una sola anfitriona

## Testing Recomendado

1. Crear un pedido con producto < $30,000 (selector individual de anfitriona)
2. Crear un pedido con 6 whiskys de $30,000+ (debe permitir hasta 6 anfitrionas)
3. Crear un pedido con producto ≥ $30,000 sin seleccionar habitación (debe permitir)
4. Crear un pedido con producto ≥ $30,000 con habitación (debe guardar correctamente)
5. Verificar que el cajero/administrador vea la habitación pre-seleccionada
6. Verificar que solo se muestren habitaciones sin comisión en el selector
