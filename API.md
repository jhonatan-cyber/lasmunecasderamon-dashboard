# API Documentation

Documentación de los endpoints API del dashboard Las Munecas De Ramon.

## Protecciones transversales

Todas las rutas API están protegidas por `withRoute` (`lib/api/withRoute.ts`),
que aplica automáticamente:

### Autenticación y permisos

- Cada ruta declara sus requisitos de `auth`, `module` y `action`
- Los administradores bypass todos los permisos
- Las rutas públicas usan `withPublicRoute`

### Validación de contenido

- **Content-Type**: Solo `application/json` y `multipart/form-data`
- **Body size limit**: Máximo 10 MB
- **XSS sanitization**: Los parámetros URL se limpian de `<` y `>`

### Rate Limiting

- **Auth endpoints**: 10 requests/min por IP
- **Mutaciones (POST/PUT/PATCH/DELETE)**: 30 requests/min por IP
- **Lecturas (GET)**: 60 requests/min por IP
- **General**: 60 requests/min por IP
- En desarrollo, el rate limiting está desactivado

### Sanitización avanzada

- **Null bytes**: Se eliminan de strings y claves de objetos
- **XSS en claves**: Se eliminan `<` y `>` de las claves de propiedades
- **SQL injection detection**: Se alertan patrones sospechosos en los logs (no
  bloquea)

### Logging con Request IDs

- Cada request genera un `x-request-id` único
- Si el cliente envía `x-request-id`, se reutiliza
- El ID se incluye en todos los logs y en el header de respuesta
- Permite rastrear una request completa en los logs

### Audit logging

- Las mutaciones auditadas se registran en la base de datos
- Los datos sensibles (passwords, tokens) se enmascaran en los logs

---

## Endpoints críticos

### Ventas

#### `POST /api/sales`

Crea una nueva venta con detalles de productos.

**Schema**: `SaleCreateSchema` (`lib/business/schemas/sale.ts`)

**Body**:

```json
{
  "total": 12000,
  "sub_total": 12000,
  "metodo_pago": "efectivo",
  "detalles": [
    {
      "producto_id": "uuid",
      "precio": 12000,
      "cantidad": 1
    }
  ],
  "servicio_id": "uuid",
  "habitacion_id": "uuid"
}
```

**Validaciones**:

- `total` ≥ 0
- Al menos 1 detalle
- `cantidad` ≥ 1 por detalle
- Para cortos: `cantidad` entre 1-99, una anfitriona por unidad
- Baucher foto: máximo definido en `BAUCHER_FOTO_MAX_CHARS`, debe ser data URL
  válido

---

### Servicios

#### `POST /api/services`

Crea un nuevo servicio con anfitrionas.

**Schema**: `ServiceCreateSchema` (`lib/business/schemas/service.ts`)

**Body**:

```json
{
  "habitacion_id": "uuid",
  "anfitrionas": ["uuid1", "uuid2"],
  "total": 50000,
  "tiempo": 120
}
```

---

### Pedidos

#### `POST /api/orders`

Crea un pedido de mesero.

**Schema**: `OrderCreateSchema` (`lib/business/schemas/order.ts`)

---

### Cuentas

#### `POST /api/accounts`

Crea una cuenta pendiente.

**Schema**: `CuentaCreateSchema` (`lib/business/schemas/cuenta.ts`)

---

### Caja

#### `POST /api/cashregister`

Abre la caja.

**Schema**: `CajaOpenSchema` (`lib/business/schemas/caja.ts`)

#### `DELETE /api/cashregister`

Cierra la caja.

**Schema**: `CajaCloseSchema` (`lib/business/schemas/caja.ts`)

#### `POST /api/cashregister/withdrawals`

Registra un retiro de caja.

**Schema**: `RetiroCajaSchema` (`lib/business/schemas/withdrawal.ts`)

---

### Clientes

#### `POST /api/clients`

Crea un nuevo cliente.

**Schema**: `ClientSchema` (`lib/business/schemas/client.ts`)

**Body**:

```json
{
  "nombre": "Juan",
  "apellido": "Pérez",
  "run": "12345678-5",
  "telefono": "+56912345678"
}
```

---

### Usuarios

#### `POST /api/users`

Crea un nuevo usuario.

**Schema**: `UserCreateSchema` (`lib/business/schemas/user.ts`)

#### `PUT /api/users/:id`

Actualiza un usuario.

**Schema**: `UserUpdateSchema` (`lib/business/schemas/user.ts`)

---

### Productos

#### `POST /api/products`

Crea un nuevo producto.

**Schema**: `ProductSchema` (`lib/business/schemas/product.ts`)

#### `PUT /api/products/:id`

Actualiza un producto.

---

### Habitaciones

#### `POST /api/rooms`

Crea una nueva habitación.

**Schema**: `RoomSchema` (`lib/business/schemas/room.ts`)

#### `PUT /api/rooms/:id`

Actualiza una habitación.

---

### Gratificaciones

#### `POST /api/gratifications`

Crea una gratificación o solicita aprobación (cajero).

**Schema**: `GratificacionCreateSchema`
(`lib/business/schemas/gratificacion.ts`)

**Body**:

```json
{
  "usuario_id": "uuid",
  "monto": 10000,
  "descripcion": "Buen servicio"
}
```

**Validaciones**:

- `monto` > 0, máximo 1,000,000, máximo 2 decimales
- `descripcion` opcional, máximo 500 caracteres

---

### Permisos

#### `POST /api/permissions`

Crea un nuevo permiso.

**Schema**: `PermissionCreateSchema` (`lib/business/schemas/permission.ts`)

**Body**:

```json
{
  "name": "Leer ventas",
  "module": "sales",
  "action": "read",
  "description": "Permite ver las ventas"
}
```

#### `PUT /api/permissions/:id`

Actualiza un permiso.

**Schema**: `PermissionUpdateSchema` (`lib/business/schemas/permission.ts`)

---

### Dispositivos biométricos

#### `POST /api/biometric/devices`

Registra un dispositivo biométrico.

**Schema**: `BiometricDeviceCreateSchema` (`lib/business/schemas/biometric.ts`)

**Body**:

```json
{
  "nombre": "Dispositivo principal",
  "marca": "zkteco",
  "serial": "SN123456",
  "ip": "192.168.1.100"
}
```

**Validaciones**:

- `marca`: solo `dahua` o `zkteco`
- `ip`: formato IPv4 válido (0-255 por octeto)

#### `PUT /api/biometric/reception`

Habilita/deshabilita recepción biométrica.

**Schema**: `BiometricReceptionUpdateSchema`
(`lib/business/schemas/biometric.ts`)

**Body**:

```json
{
  "habilitado": true
}
```

---

### Colaciones

#### `POST /api/meals`

Registra una colación.

**Schema**: `ColacionCreateSchema` (`lib/business/schemas/colacion.ts`)

**Body**:

```json
{
  "usuario_id": "uuid",
  "presentacion_id": "uuid",
  "acompanamiento": "gaseosa"
}
```

**Validaciones**:

- `acompanamiento`: solo `gaseosa` o `soda`

---

### Anticipos

#### `POST /api/advances/requests`

Solicita un anticipo.

**Schema**: `AnticipoRequestSchema` (`lib/business/schemas/anticipo.ts`)

---

### Horas extras

#### `POST /api/overtime`

Registra horas extras.

**Schema**: `ExtraHoursSchema` (`lib/business/schemas/extra-hours.ts`)

---

### Reservas de quincho

#### `POST /api/quinchos`

Crea una reserva de quincho.

**Schema**: `ReservaQuinchoSchema` (`lib/business/schemas/quincho.ts`)

---

### Comisiones

#### `POST /api/commissions`

Crea una comisión personalizada.

**Schema**: `CommissionCreateSchema` (`lib/business/schemas/commission.ts`)

---

### Categorías

#### `POST /api/categories`

Crea una categoría de producto.

**Schema**: `CategorySchema` (`lib/business/schemas/category.ts`)

---

### Roles

#### `POST /api/roles`

Crea un nuevo rol.

**Schema**: `RoleWriteSchema` (`lib/business/schemas/role.ts`)

#### `PUT /api/roles/:id`

Actualiza un rol.

---

## Helpers de validación

Los schemas usan helpers centralizados en
`lib/business/schemas/validationMessages.ts`:

| Helper                              | Descripción                                           |
| ----------------------------------- | ----------------------------------------------------- |
| `montoSchema({ max?, allowZero? })` | Valida montos monetarios (positivo, 2 decimales, max) |
| `idSchema({ nullable?, label? })`   | Valida IDs no vacíos                                  |
| `descripcionSchema(maxChars)`       | Valida descripciones opcionales                       |
| `nombreSchema({ max?, label? })`    | Valida nombres requeridos                             |
| `runRefinement(value)`              | Valida RUN chileno                                    |
| `phoneRefinement(value)`            | Valida teléfono chileno                               |
| `emailRefinement(value)`            | Valida email                                          |
| `dateRefinement(value)`             | Valida fecha YYYY-MM-DD                               |
| `ipv4Refinement(value)`             | Valida IPv4 (0-255 por octeto)                        |

## Mensajes de error

Los mensajes están centralizados en `VALIDATION_MESSAGES`:

```typescript
import { VALIDATION_MESSAGES } from '@/lib/business/schemas/validationMessages';

VALIDATION_MESSAGES.required; // 'El campo es requerido'
VALIDATION_MESSAGES.positive; // 'El valor debe ser positivo'
VALIDATION_MESSAGES.max('Nombre', 100); // 'Nombre no puede exceder 100 caracteres'
```

## Respuestas de error

### 400 - Bad Request

```json
{
  "success": false,
  "message": "Content-Type debe ser application/json o multipart/form-data",
  "code": "INVALID_CONTENT_TYPE"
}
```

### 401 - Unauthorized

```json
{
  "success": false,
  "message": "No autenticado",
  "code": "UNAUTHORIZED"
}
```

### 403 - Forbidden

```json
{
  "success": false,
  "message": "Permisos insuficientes",
  "code": "FORBIDDEN"
}
```

### 422 - Unprocessable Entity (Zod validation)

```json
{
  "success": false,
  "message": "Error de validación de datos",
  "errors": [
    {
      "path": "monto",
      "message": "El valor debe ser positivo"
    }
  ]
}
```

### 429 - Too Many Requests

```json
{
  "success": false,
  "message": "Demasiadas solicitudes. Por favor, espera antes de intentar nuevamente.",
  "code": "RATE_LIMIT_EXCEEDED",
  "resetIn": 30000
}
```

Headers: `Retry-After`, `X-RateLimit-Limit`, `X-RateLimit-Remaining`,
`X-RateLimit-Reset`

### 500 - Internal Server Error

```json
{
  "success": false,
  "message": "Error interno del servidor",
  "error": {
    "code": "UNKNOWN_ERROR",
    "message": "Error interno del servidor"
  }
}
```
