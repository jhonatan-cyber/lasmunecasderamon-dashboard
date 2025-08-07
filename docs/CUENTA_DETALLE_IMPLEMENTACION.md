# Implementación de Ver Detalle de Cuenta

## Descripción
Se ha implementado la funcionalidad completa para ver los detalles de una cuenta, incluyendo un modal detallado que muestra toda la información relevante de la cuenta.

## Componentes Implementados

### 1. CuentaDetailModal.tsx
- **Ubicación**: `components/cuentas/CuentaDetailModal.tsx`
- **Funcionalidad**: Modal que muestra los detalles completos de una cuenta
- **Características**:
  - Información general de la cuenta (código, cliente, habitación, fecha, estado)
  - Resumen financiero (sub total, comisión, total)
  - Tabla de productos con detalles (nombre, cantidad, precio, sub total, comisión)
  - Lista de usuarios asociados
  - Botones de acción (cerrar, marcar como cobrada)

### 2. CuentaTable.tsx (Actualizado)
- **Ubicación**: `components/cuentas/CuentaTable.tsx`
- **Funcionalidad**: Tabla de cuentas con integración del modal de detalles
- **Nuevas características**:
  - Botón "Ver detalles" en el menú de acciones
  - Integración del modal de detalles
  - Estado para manejar la apertura/cierre del modal

## Endpoint API

### GET /api/cuentas/[id]
- **Ubicación**: `pages/api/cuentas/[id].ts`
- **Funcionalidad**: Obtiene los detalles completos de una cuenta
- **Datos retornados**:
  - Información básica de la cuenta
  - Detalles de productos con nombres
  - Usuarios asociados con nombres
  - Totales y comisiones

## Uso

### En la tabla de cuentas:
1. Hacer clic en el menú de acciones (tres puntos)
2. Seleccionar "Ver detalles"
3. Se abrirá el modal con toda la información de la cuenta

### Integración en otros componentes:
```tsx
import { CuentaDetailModal } from "@/components/cuentas";

// En tu componente
const [detailModalOpen, setDetailModalOpen] = useState(false);
const [selectedCuentaId, setSelectedCuentaId] = useState<number | null>(null);

const handleVerDetalles = (cuentaId: number) => {
  setSelectedCuentaId(cuentaId);
  setDetailModalOpen(true);
};

// En el JSX
<CuentaDetailModal
  open={detailModalOpen}
  onOpenChange={setDetailModalOpen}
  cuentaId={selectedCuentaId}
/>
```

## Características del Modal

### Información Mostrada:
- **Código de cuenta**: Identificador único
- **Cliente**: Nombre del cliente asociado
- **Habitación**: Número de habitación (si aplica)
- **Fecha**: Fecha y hora de creación
- **Estado**: Badge con estado (Por Cobrar/Cobrada)
- **Usuarios**: Número de usuarios asociados

### Resumen Financiero:
- **Sub Total**: Suma de productos sin comisiones
- **Comisión**: Total de comisiones
- **Total**: Monto total de la cuenta

### Detalle de Productos:
- Tabla con columnas: Producto, Cantidad, Precio, Sub Total, Comisión
- Muestra nombres de productos cuando están disponibles
- Formato de moneda para valores monetarios

### Usuarios Asociados:
- Lista de usuarios vinculados a la cuenta
- Muestra nombres completos cuando están disponibles

## Estilos y UX

### Diseño:
- Modal responsivo con scroll interno
- Colores consistentes con el tema del proyecto
- Iconos de FontAwesome para mejor UX
- Badges para estados
- Formato de moneda sin decimales

### Interacciones:
- Botón de cerrar en la esquina superior derecha
- Botón "Marcar como Cobrada" para cuentas pendientes
- Hover effects en botones
- Transiciones suaves

## Formato de Fechas
- Se utiliza el formato DD/mes/YYYY HH:mm
- Ejemplo: "25/julio/2025 14:30"

## Notificaciones
- Uso de `toast` de la librería `sonner` para errores
- Mensajes de error descriptivos
- Loading states durante la carga

## Dependencias
- `@fortawesome/react-fontawesome` para iconos
- `sonner` para notificaciones
- Componentes UI del proyecto (Dialog, Table, Badge, etc.)
- `formatCurrencyNoDecimals` para formato de moneda

## Próximas Mejoras Sugeridas
1. Funcionalidad para marcar como cobrada desde el modal
2. Edición de detalles desde el modal
3. Exportación de detalles a PDF
4. Historial de cambios en la cuenta
5. Integración con sistema de notificaciones 