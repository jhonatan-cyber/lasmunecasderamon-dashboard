# Módulo de Caja

## Descripción
El módulo de caja permite gestionar las cajas registradoras del sistema, incluyendo apertura, cierre, seguimiento de transacciones y reportes financieros.

## Características

### Funcionalidades Principales
- **Apertura de Caja**: Crear nuevas cajas con monto inicial y usuario asignado
- **Cierre de Caja**: Cerrar cajas con balance final y usuario de cierre
- **Seguimiento de Transacciones**: Monitorear ventas, efectivo, tarjeta, transferencias y servicios
- **Filtros y Búsqueda**: Filtrar cajas por estado y buscar por cajero o ID
- **Reportes**: Resumen financiero con totales por método de pago
- **Gestión de Usuarios**: Asignar cajeros y usuarios de cierre

### Estados de Caja
- **1**: Abierta - Caja activa y operativa
- **0**: Cerrada - Caja cerrada con balance final
- **-1**: Eliminada - Caja marcada como eliminada (soft delete)

## Componentes

### Hook Personalizado: `useCaja`
```typescript
const {
  cajas,           // Lista de cajas
  resumen,         // Resumen financiero
  loading,         // Estado de carga
  error,           // Error si existe
  getCajas,        // Obtener cajas
  getResumen,      // Obtener resumen
  createCaja,      // Crear caja
  cerrarCaja,      // Cerrar caja
  deleteCaja,      // Eliminar caja
} = useCaja()
```

### Componentes UI
- **CajaCard**: Tarjeta que muestra información resumida de una caja
- **CajaFormDialog**: Formulario para abrir nueva caja
- **CerrarCajaDialog**: Formulario para cerrar caja con validaciones
- **CajaDetails**: Vista detallada de una caja específica
- **CajaFilters**: Filtros de búsqueda y estado

## API Endpoints

### GET `/api/caja`
- **Sin parámetros**: Obtiene todas las cajas
- **`?id=X`**: Obtiene caja específica por ID
- **`?estado=X`**: Filtra por estado (1=abierta, 0=cerrada)
- **`?resumen=1`**: Obtiene resumen financiero

### POST `/api/caja`
Crea una nueva caja:
```json
{
  "usuario_id_apertura": 1,
  "monto_apertura": 1000.00
}
```

### PUT `/api/caja`
Actualiza una caja existente:
```json
{
  "id": 1,
  "ventas": 500.00,
  "efectivo": 300.00,
  "tarjeta": 200.00
}
```

### PATCH `/api/caja`
Cierra una caja:
```json
{
  "id_caja": 1,
  "monto_cierre": 1500.00,
  "usuario_id_cierre": 2
}
```

### DELETE `/api/caja?id=X`
Elimina una caja (soft delete)

## Tipos de Datos

### Caja
```typescript
interface Caja {
  id_caja: number;
  fecha_apertura: string;
  usuario_id_apertura: number;
  monto_apertura: number;
  ventas: number;
  efectivo: number;
  tarjeta: number;
  transferencia: number;
  servicios: number;
  devoluciones: number;
  monto_cierre: number | null;
  usuario_id_cierre: number | null;
  fecha_cierre: string | null;
  estado: number;
}
```

### CajaWithUser
Extiende `Caja` con información de usuarios:
```typescript
interface CajaWithUser extends Caja {
  cajero_nombre?: string;
  cajero_cierre_nombre?: string;
}
```

### CajaResumen
```typescript
interface CajaResumen {
  total_ventas: number;
  total_efectivo: number;
  total_tarjeta: number;
  total_transferencia: number;
  total_servicios: number;
  total_devoluciones: number;
  cajas_abiertas: number;
  cajas_cerradas: number;
}
```

## Validaciones

### Apertura de Caja
- Usuario debe existir y estar activo
- Usuario no puede tener otra caja abierta
- Monto de apertura debe ser >= 0

### Cierre de Caja
- Caja debe existir y estar abierta
- Usuario de cierre debe existir y estar activo
- Monto de cierre debe ser >= 0

### Actualización
- Solo se pueden actualizar cajas abiertas
- Todos los montos deben ser >= 0

## Uso

### Crear Nueva Caja
```typescript
const handleCreateCaja = async (data: CajaCreate) => {
  try {
    await createCaja(data);
    // Caja creada exitosamente
  } catch (error) {
    // Manejar error
  }
};
```

### Cerrar Caja
```typescript
const handleCerrarCaja = async (data: CajaCierre) => {
  try {
    await cerrarCaja(data);
    // Caja cerrada exitosamente
  } catch (error) {
    // Manejar error
  }
};
```

### Filtrar Cajas
```typescript
const filteredCajas = cajas.filter((caja) => {
  const matchesSearch = caja.cajero_nombre?.toLowerCase().includes(searchTerm);
  const matchesStatus = filterStatus === "all" || caja.estado.toString() === filterStatus;
  return matchesSearch && matchesStatus;
});
```

## Notificaciones
El módulo utiliza:
- **Sonner**: Para notificaciones de éxito y error
- **SweetAlert2**: Para confirmaciones de eliminación

## Estilos
- Diseño minimalista siguiendo las mejores prácticas del proyecto
- Componentes reutilizables de la librería UI
- Responsive design para diferentes tamaños de pantalla
- Iconos de Lucide React para consistencia visual 