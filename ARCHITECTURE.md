# Arquitectura del Dashboard

## Visión general

El dashboard es una aplicación Next.js que sirve como panel de administración y
operación para el negocio. Se compone de tres capas:

```
┌─────────────────────────────────────────────────────────────┐
│  Frontend (Next.js App Router)                              │
│  ┌──────────────┐ ┌──────────────┐ ┌────────────────────┐  │
│  │  Pages       │ │  Components  │ │  Hooks (React Query)│  │
│  └──────────────┘ └──────────────┘ └────────────────────┘  │
├─────────────────────────────────────────────────────────────┤
│  API Layer (app/api/)                                       │
│  ┌──────────────┐ ┌──────────────┐ ┌────────────────────┐  │
│  │  Routes      │ │  withRoute   │ │  SSE Manager       │  │
│  │  (handlers)  │ │  (wrapper)   │ │  (tiempo real)     │  │
│  └──────────────┘ └──────────────┘ └────────────────────┘  │
├─────────────────────────────────────────────────────────────┤
│  Business Layer (modules/)                                  │
│  ┌──────────────┐ ┌──────────────┐ ┌────────────────────┐  │
│  │  Servicios   │ │  Repositorios│ │  Fachadas          │  │
│  └──────────────┘ └──────────────┘ └────────────────────┘  │
├─────────────────────────────────────────────────────────────┤
│  Transaction Layer (lib/transaction/)                       │
│  ┌──────────────┐ ┌──────────────┐                          │
│  │  UnidadDe    │ │  Contexto    │                          │
│  │  Trabajo     │ │  Operacion   │                          │
│  └──────────────┘ └──────────────┘                          │
├─────────────────────────────────────────────────────────────┤
│  Database (PostgreSQL)                                      │
└─────────────────────────────────────────────────────────────┘
```

## Patrón de Unidad de Trabajo

### Problema

El §6 del plan de monolito modular establece que:

- Los participantes de una operación atómica reciben "un contexto transaccional
  opaco"
- Solo la infraestructura autorizada resuelve al cliente PostgreSQL
- El contrato no expone una función SQL arbitraria

### Solución

`lib/transaction/contract.ts` define `UnidadDeTrabajo` y `ContextoOperacion`:

```typescript
interface UnidadDeTrabajo {
  readonly id: string;
  readonly abierta: boolean;
  ejecutar<T>(
    operacion: (contexto: ContextoOperacion) => Promise<T>
  ): Promise<T>;
}
```

**Clave**: Quien recibe una `UnidadDeTrabajo` puede pedir operaciones al módulo
que se la entregó, pero no ejecutar SQL directamente. Las operaciones de cada
módulo viven en su API pública.

### Uso

```typescript
import { enUnaUnidad } from '@/lib/transaction/contract';

const resultado = await enUnaUnidad(async unidad => {
  // Paso 1: módulo A
  const opA = await moduloA.algunaOperacion(unidad);
  // Paso 2: módulo B
  const opB = await moduloB.otraOperacion(unidad);
  // Si algo falla, toda la transacción se revierte
  return { opA, opB };
});
```

## Workflows

Los workflows (`workflows/`) coordinan operaciones atómicas entre múltiples
módulos. Son el patrón principal para flujos de negocio complejos.

### Ejemplo: `registrar-venta.ts`

1. Valida los datos de entrada con Zod
2. Abre una unidad de trabajo
3. Crea la venta en el módulo de operación
4. Actualiza el stock en el módulo de inventario
5. Registra la comisión en el módulo de personal
6. Emite evento SSE para actualizar clientes en tiempo real
7. Si algo falla, toda la transacción se revierte

### Ejecución de efectos confirmados

Después de confirmar la transacción, se ejecutan los efectos externos
(notificaciones, SSE, logs) que no deben revertirse:

```typescript
await enUnaUnidad(async (unidad) => {
  // Operaciones atómicas
  return { efectos: () => sendNotification(...) };
}).then(resultado => resultado.efectos());
```

## Protecciones Transversales

### `withRoute` — Wrapper de rutas

Cada ruta API usa `withRoute` que proporciona:

1. **Request ID**: Genera o reutiliza `x-request-id` para trazabilidad en logs
2. **Rate Limiting**: Limita requests por IP (auth: 10/min, mutation: 30/min,
   general: 60/min)
3. **Content-Type Validation**: Solo acepta `application/json` y
   `multipart/form-data`
4. **Body Size Limit**: Máximo 10 MB
5. **XSS Sanitization**: Limpia `<` y `>` en parámetros URL
6. **SQL Injection Detection**: Detecta y alerta patrones sospechosos en el body
   JSON
7. **Auth & Permissions**: Verifica autenticación y permisos por ruta
8. **Audit Logging**: Registra mutaciones en el log de auditoría
9. **SSE Notification**: Emite `resource_updated` tras mutaciones exitosas
10. **Error Handling**: Convierte `ZodError` a 422, otros errores a respuestas
    seguras

### Tipos de configuración de ruta

```typescript
// Con permiso específico
withRoute({ auth: true, module: 'sales', action: 'write' }, handler);

// Solo administrador
withRoute({ auth: true, access: 'administrator' }, handler);

// Solo autenticado (datos propios)
withRoute({ auth: true, access: 'authenticated' }, handler);

// Pública
withPublicRoute(handler);
```

## Validación con Zod

### Arquitectura de doble capa

1. **Capa API**: Las routes usan `validateOrResponse()` para validar el body
   antes de procesarlo
2. **Capa Servicio**: Los servicios validan nuevamente con `.parse()` antes de
   escribir en la BD

### Schemas disponibles

Ubicados en `lib/business/schemas/`:

- `sale.ts` — Ventas con detalles, acompañamientos, baucher
- `service.ts` — Servicios con anfitrionas, prepago
- `order.ts` — Pedidos de meseros
- `cuenta.ts` — Cuentas con detalles
- `client.ts` — Clientes (nombre, apellido, RUN, teléfono)
- `user.ts` — Usuarios con código biométrico
- `product.ts` — Productos y presentaciones
- `room.ts` — Habitaciones con precio y tiempo
- `caja.ts` — Apertura y cierre de caja
- `withdrawal.ts` — Retiros de caja
- `attendance.ts` — Asistencia QR
- `anticipo.ts` — Solicitudes de anticipo
- `commission.ts` — Comisiones personalizadas
- `tip.ts` — Propinas por venta
- `category.ts` — Categorías de productos
- `role.ts` — Roles y permisos
- `gratificacion.ts` — Gratificaciones
- `permission.ts` — Permisos
- `biometric.ts` — Dispositivos biométricos
- `colacion.ts` — Colaciones
- `validationMessages.ts` — Mensajes centralizados y helpers reutilizables

### Helpers de validación

`validationMessages.ts` proporciona:

- `VALIDATION_MESSAGES` — Diccionario de mensajes en español
- `montoSchema()` — Schema de monto con validación de decimales y rango
- `idSchema()` — Schema de ID no vacío
- `descripcionSchema()` — Schema de descripción opcional
- `nombreSchema()` — Schema de nombre con límites
- `runRefinement()` — Validación de RUN chileno
- `phoneRefinement()` — Validación de teléfono chileno
- `emailRefinement()` — Validación de email
- `dateRefinement()` — Validación de fecha YYYY-MM-DD
- `ipv4Refinement()` — Validación de dirección IPv4

## Erros Tipados

`lib/errors/errors.ts` define clases de error con código y status HTTP:

- `ValidationError` (400) — Datos de entrada inválidos
- `NotFoundError` (404) — Recurso no encontrado
- `ConflictError` (409) — Conflicto de datos
- `BusinessError` (422) — Regla de negocio violada
- `DatabaseError` (500) — Error de base de datos

`formatErrorResponse()` convierte cualquier error a una respuesta JSON segura
para el cliente.

## Eventos SSE (Server-Sent Events)

### Arquitectura

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│  Route API   │────▶│  SSE Manager │────▶│  Clientes    │
│  emite       │     │  reparte     │     │  reciben     │
└──────────────┘     └──────────────┘     └──────────────┘
```

### Tipado

Cada evento tiene su tipo de datos definido en `lib/api/sseTypes.ts`:

```typescript
sendNotificationToAll('updateSales', { id: '123', type: 'created' });
// TypeScript verifica que el payload coincida con UpdateSalesData
```

### Audiencia

`lib/api/sseEvents.ts` define quién recibe cada evento:

- `staff` — Cualquier sesión válida
- `role` — Solo roles específicos
- `user` — Solo el usuario afectado
- `kiosk` — Pantalla pública con proyección reducida

## Sanitización

`lib/api/sanitize.ts` proporciona:

- `sanitizeXSS()` — Escapa entidades HTML
- `sanitizeNullBytes()` — Elimina bytes nulos
- `sanitizeMaxLength()` — Recorta strings largos
- `sanitizeBody()` — Sanitiza recursivamente objetos
- `detectSQLInjection()` — Detecta patrones de inyección SQL
- `scanForSQLInjection()` — Busca inyección en objetos anidados
- `sanitizeRequest()` — Middleware completo de sanitización

## Rate Limiting

`lib/api/rateLimit.ts` implementa un limiter en memoria con 4 perfiles:

- `auth` — 10 req/min (login, registro, reset password)
- `mutation` — 30 req/min (POST, PUT, PATCH, DELETE)
- `general` — 60 req/min (resto de endpoints)
- `read` — 120 req/min (GET endpoints)

En desarrollo (`NODE_ENV=development`), el rate limiting está desactivado.

## Logging Estructurado

`lib/utils/logger.ts` proporciona:

- `setRequestId()` / `getRequestId()` / `clearRequestId()` — Trazabilidad por
  request
- Todos los logs incluyen el `requestId` para correlación
- Los errores se capturan con `logger.captureException()`

## App Expo (Móvil)

La app Expo (`lasmunecasderamon-app`) comparte el mismo backend API y tiene su
propia capa de validación:

- `packages/validations/` — Schemas Zod para validar antes de enviar al servidor
- `api/request.ts` — Cliente HTTP con retry, timeout y manejo de tokens
- Los schemas cubren: login, orders, services, anticipos, configuraciones

## Testing

- **Unitarios**: `tests/unit/` — Schemas, servicios, utilidades
- **PostgreSQL**: `tests/postgres/` — Flujos con base de datos real
- **E2E**: `tests/e2e/` — Flujos completos de la aplicación
- **Benchmarks**: `tests/benchmarks/` — Rendimiento de consultas
- **Seguridad**: `tests/unit/lib/api/security.test.ts` — Rate limiting,
  sanitización, SQL injection
