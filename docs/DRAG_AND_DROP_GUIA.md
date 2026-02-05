# Drag and Drop - Reordenamiento de Elementos

## Módulos con drag and drop implementado

La funcionalidad de arrastrar y reordenar elementos está implementada en:

### 1. Productos
- **Ubicación**: Productos → Seleccionar categoría
- **Vistas disponibles**: Tabla y Cards
- **Alcance**: Por categoría

### 2. Habitaciones
- **Ubicación**: Habitaciones
- **Vistas disponibles**: Tabla y Cards
- **Alcance**: Global

## Instalación

### 1. Ejecutar migraciones SQL

Ejecuta los siguientes scripts en tu base de datos:

```bash
# Para productos
mysql -u tu_usuario -p lasmunecasderamon < database/migrations/add_display_order_to_productos.sql

# Para habitaciones
mysql -u tu_usuario -p lasmunecasderamon < database/migrations/add_display_order_to_habitaciones.sql
```

### 2. Instalar dependencias

```bash
pnpm add @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities
```

## Cómo usar

### Vista de Tabla
- El ícono de agarre (⋮⋮) aparece al inicio de cada fila
- Haz clic y arrastra la fila hacia arriba o abajo
- El orden se guarda automáticamente

### Vista de Cards
- Al pasar el mouse sobre un card, aparece el ícono de agarre en la esquina superior derecha
- Haz clic y arrastra el card a una nueva posición
- El orden se guarda automáticamente en todas las vistas

## Características

✅ Drag and drop en vista de tabla
✅ Drag and drop en vista de cards
✅ Guardado automático del orden
✅ Animaciones suaves durante el arrastre
✅ Feedback visual (opacidad reducida al arrastrar)
✅ Funciona con paginación
✅ Compatible con filtros de búsqueda
✅ Responsive (funciona en móvil)

## Archivos modificados

### Productos
- `database/migrations/add_display_order_to_productos.sql`
- `pages/api/products/reorder.ts`
- `pages/api/products.ts`
- `components/products/ProductTable.tsx`
- `components/products/ProductCard.tsx`
- `hooks/useProducts.ts`
- `app/products/category/[id]/page.tsx`
- `types/product.ts`

### Habitaciones
- `database/migrations/add_display_order_to_habitaciones.sql`
- `pages/api/rooms/reorder.ts`
- `pages/api/rooms.ts`
- `components/rooms/RoomTable.tsx`
- `components/rooms/RoomCard.tsx`
- `hooks/useRooms.ts`
- `app/rooms/page.tsx`
- `types/room.ts`

## Notas técnicas

### Estrategias de ordenamiento
- **Tabla**: `verticalListSortingStrategy` - optimizado para listas verticales
- **Cards**: `rectSortingStrategy` - optimizado para grids bidimensionales

### Sensores configurados
- **PointerSensor**: Activación tras 8px de movimiento (evita clics accidentales)
- **KeyboardSensor**: Soporte para navegación con teclado (accesibilidad)

### Estado local vs remoto
- El reordenamiento actualiza primero el estado local para una respuesta instantánea
- Luego envía la actualización al servidor
- Si falla, revierte al orden original automáticamente

## Limitaciones conocidas

- El reordenamiento solo afecta a los elementos filtrados actualmente visibles
- Al cambiar de página o filtro, se mantiene el orden global
- No se puede arrastrar entre diferentes categorías (solo en productos)

## Personalización

Para agregar drag and drop a otros módulos, sigue estos pasos:

1. Agregar campo `display_order` a la tabla
2. Crear endpoint API para actualizar el orden
3. Actualizar el componente con `useSortable` hook
4. Envolver con `DndContext` y `SortableContext`
5. Implementar función de reordenamiento en el hook

Consulta los archivos existentes como referencia.
