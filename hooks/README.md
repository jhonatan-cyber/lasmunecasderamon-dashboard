# Hooks - Estructura Organizada

Los hooks están organizados por dominio/módulo para mejorar la mantenibilidad y facilitar la navegación del código.

## 📁 Estructura de Carpetas

### `shared/` - Hooks Genéricos y Compartidos
Hooks reutilizables que se usan en múltiples módulos.

- `useGenericFetch.ts` - Fetch de datos con loading/error
- `useGenericMutations.ts` - Operaciones CRUD (create/update/delete)
- `useGenericFilters.ts` - Filtros, búsqueda y paginación
- `usePagination.ts` - Paginación genérica
- `useConfirmModal.ts` - Modal de confirmación
- `useOptimizedData.ts` - Optimización de datos
- `use-mobile.tsx` - Detección de dispositivos móviles
- `use-toast.ts` - Sistema de notificaciones toast

### `auth/` - Autenticación y Permisos
Hooks relacionados con autenticación, sesiones y permisos de usuario.

- `useCurrentUser.ts` - Usuario actual
- `usePermissions.ts` - Permisos del sistema
- `usePermissionsSSE.ts` - Permisos con Server-Sent Events
- `useUserPermissions.ts` - Permisos de usuario específico
- `useSessionCheck.ts` - Verificación de sesión
- `useLogins.ts` - Gestión de logins

### `caja/` - Caja y Finanzas
Hooks para gestión de caja, ventas y transacciones financieras.

- `useCashRegister.ts` - Gestión de caja registradora
- `useCashRegisterStatus.ts` - Estado de caja
- `useRetiros.ts` - Retiros de efectivo
- `useCuentas.ts` - Cuentas y transacciones
- `useSales.ts` - Ventas

### `productos/` - Productos y Categorías
Hooks para gestión de productos y sus categorías.

- `useProducts.ts` - ✅ Optimizado - Gestión de productos
- `useCategories.ts` - ✅ Optimizado - Gestión de categorías

### `clientes/` - Clientes
Hooks para gestión de clientes.

- `useClients.ts` - ✅ Optimizado - Gestión de clientes (incluye `useClientes`)

### `habitaciones/` - Habitaciones/Rooms
Hooks para gestión de habitaciones y espacios.

- `useRooms.ts` - ✅ Optimizado - Gestión de habitaciones
- `useHabitaciones.ts` - Habitaciones (versión alternativa)

### `personal/` - Personal y Empleados
Hooks para gestión de empleados, asistencias, comisiones y nómina.

- `useUsers.ts` - Gestión de usuarios/empleados
- `useEmployees.ts` - Empleados
- `useRoles.ts` - Roles de usuario
- `useAnfitrionas.ts` - Anfitrionas
- `useAnfitrionasDisponibles.ts` - Anfitrionas disponibles
- `useGarzones.ts` - Garzones
- `useAsistencias.ts` - Asistencias
- `useAttendanceStats.ts` - Estadísticas de asistencia
- `useAnticipos.ts` - Anticipos
- `useCommissions.ts` - Comisiones
- `useCommissionStats.ts` - Estadísticas de comisiones
- `useOvertime.ts` - Horas extras
- `useTips.ts` - Propinas
- `usePayroll.ts` - Nómina
- `usePayrollSummary.ts` - Resumen de nómina

### `servicios/` - Servicios y Órdenes
Hooks para gestión de servicios, órdenes y devoluciones.

- `useOrders.ts` - Órdenes
- `useUserOrders.ts` - Órdenes de usuario
- `useServicios.ts` - Servicios
- `useServiceLogic.ts` - Lógica de servicios
- `useServiceTimer.ts` - Temporizador de servicios
- `useServicioTimerSync.ts` - Sincronización de temporizadores
- `useEditTimer.ts` - Edición de temporizadores
- `useDevolucionFilters.ts` - Filtros de devoluciones
- `useDevolucionLogic.ts` - Lógica de devoluciones
- `useDevolucionResponse.ts` - Respuesta de devoluciones
- `useDevolucionVentasLogic.ts` - Lógica de devoluciones de ventas

### `calendario/` - Calendario
Hooks para gestión de calendario y eventos.

- `useCalendarActions.ts` - Acciones de calendario

### `estadisticas/` - Estadísticas y Reportes
Hooks para estadísticas y reportes del sistema.

- `useStats.ts` - Estadísticas generales
- `useLoggedUsersStats.ts` - Estadísticas de usuarios conectados

### `notificaciones/` - Notificaciones
Hooks para sistema de notificaciones.

- `useNotifications.tsx` - Gestión de notificaciones

### `landing/` - Landing Page
Hooks específicos para la landing page.

- `useLandingState.ts` - Estado de landing page

### `docs/` - Documentación
Documentación y hooks relacionados con documentación.

- `OPTIMIZACION_HOOKS.md` - Documentación de optimización de hooks
- `useSwaggerWarnings.ts` - Advertencias de Swagger/API docs

## 🎯 Hooks Optimizados

Los siguientes hooks han sido optimizados usando los hooks genéricos de `shared/`:

- ✅ `clientes/useClients.ts` - 56% reducción de código
- ✅ `productos/useProducts.ts` - 45% reducción de código
- ✅ `productos/useCategories.ts` - 7% reducción de código
- ✅ `habitaciones/useRooms.ts` - 35% reducción de código

## 📝 Convenciones de Uso

### Importar Hooks Genéricos
```typescript
// Opción 1: Desde el index (recomendado)
import { useGenericFetch, useGenericMutations } from '@/hooks/shared';

// Opción 2: Directo desde el archivo
import { useGenericFetch } from '@/hooks/shared/useGenericFetch';
```

### Importar Hooks de Dominio
```typescript
// Opción 1: Desde el index (recomendado)
import { useClients } from '@/hooks/clientes';
import { useProducts, useCategories } from '@/hooks/productos';
import { useRooms } from '@/hooks/habitaciones';

// Opción 2: Directo desde el archivo
import { useClients } from '@/hooks/clientes/useClients';
import { useProducts } from '@/hooks/productos/useProducts';
```

### Importar Hooks Genéricos Dentro de Otros Hooks
```typescript
// Usar rutas relativas
import { useGenericFetch } from '../shared/useGenericFetch';
import { useGenericMutations } from '../shared/useGenericMutations';
```

## 🔄 Migración

Si encuentras imports antiguos como:
```typescript
import { useClients } from '@/hooks/useClients';
```

Actualízalos a:
```typescript
import { useClients } from '@/hooks/clientes/useClients';
```

La mayoría de los imports se actualizaron automáticamente con `smartRelocate`.

## 📚 Más Información

- Ver `docs/OPTIMIZACION_HOOKS.md` para detalles sobre la optimización de hooks
- Ver `shared/` para documentación de hooks genéricos reutilizables
