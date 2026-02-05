# Sistema de Solicitudes de Servicios

Este sistema implementa un flujo de aprobación para la creación de servicios desde el módulo de pedidos.

## Flujo de Trabajo

1. **Usuario crea solicitud**: Cualquier usuario puede crear una solicitud de servicio desde el módulo de pedidos (pestaña "Servicios")
2. **Notificación**: La solicitud genera una notificación para usuarios con rol `cajero` o `administrador`
3. **Revisión**: El cajero/administrador revisa la solicitud en `/solicitudes-servicios`
4. **Decisión**:
   - **Aprobar**: Se crea el servicio automáticamente y se notifica al solicitante
   - **Rechazar**: Se marca como rechazada con motivo y se notifica al solicitante

## Instalación

### 1. Migración de Base de Datos

Ejecuta el siguiente script SQL en tu base de datos:

```bash
# Opción 1: Desde MySQL CLI
mysql -u tu_usuario -p nombre_base_datos < database/migrations/create_solicitudes_servicios.sql

# Opción 2: Desde phpMyAdmin o similar
# Copia el contenido de database/migrations/create_solicitudes_servicios.sql
# Y ejecútalo en tu base de datos
```

El script creará la tabla `solicitudes_servicios` con los siguientes campos:
- `id_solicitud`: ID único de la solicitud
- `cliente_id`: ID del cliente (opcional)
- `habitacion_id`: ID de la habitación
- `precio_servicio`: Precio del servicio
- `precio_habitacion`: Precio de la habitación
- `anfitrionas_ids`: Array JSON con IDs de anfitrionas
- `metodo_pago`: Método de pago (efectivo, tarjeta, transferencia)
- `tiempo`: Tiempo del servicio en minutos
- `total`: Total calculado
- `solicitado_por`: ID del usuario que creó la solicitud
- `estado`: Estado de la solicitud (pendiente, aprobada, rechazada)
- `motivo_rechazo`: Razón del rechazo (si aplica)
- `procesado_por`: ID del usuario que aprobó/rechazó
- `fecha_solicitud`: Fecha de creación
- `fecha_procesamiento`: Fecha de aprobación/rechazo

## Endpoints API

### POST /api/solicitudes-servicios
Crea una nueva solicitud de servicio.

**Body:**
```json
{
  "cliente_id": 1,
  "habitacion_id": 2,
  "precio_servicio": 50000,
  "precio_habitacion": 30000,
  "anfitrionas_ids": [1, 2],
  "metodo_pago": "efectivo",
  "tiempo": 60,
  "total": 160000
}
```

### GET /api/solicitudes-servicios?estado=pendiente
Lista solicitudes filtradas por estado.

### PATCH /api/solicitudes-servicios/:id/aprobar
Aprueba una solicitud y crea el servicio.

### PATCH /api/solicitudes-servicios/:id/rechazar
Rechaza una solicitud.

**Body:**
```json
{
  "motivo_rechazo": "No hay habitaciones disponibles"
}
```

## Componentes

### ServiceOrderFormNew
- **Ubicación**: `components/orders/ServiceOrderFormNew.tsx`
- **Funcionalidad**: Formulario para crear solicitudes de servicio
- **Características**:
  - Selección de cliente (opcional)
  - Selección de habitación (solo disponibles)
  - Selección múltiple de anfitrionas (solo libres)
  - Precio de servicio manual
  - Método de pago
  - Cálculo automático de total con IVA
  - Envío de solicitud en lugar de creación directa

### SolicitudesServiciosList
- **Ubicación**: `components/solicitudes-servicios/SolicitudesServiciosList.tsx`
- **Funcionalidad**: Lista de solicitudes pendientes para cajeros/administradores
- **Características**:
  - Visualización de solicitudes pendientes
  - Detalles completos de cada solicitud
  - Botón para aprobar (crea servicio automáticamente)
  - Botón para rechazar (con campo para motivo)
  - Actualizaciones en tiempo real

## Permisos

El acceso a la página de solicitudes pendientes (`/solicitudes-servicios`) requiere uno de los siguientes roles:
- **cajero**
- **administrador**

## Notificaciones

El sistema crea notificaciones automáticas en los siguientes casos:

1. **Nueva solicitud creada**: Notifica a todos los cajeros y administradores
2. **Solicitud aprobada**: Notifica al usuario que creó la solicitud
3. **Solicitud rechazada**: Notifica al usuario que creó la solicitud con el motivo

## Navegación

La opción "Solicitudes de Servicios" se encuentra en el sidebar bajo la sección de "Servicios", junto con "Crear Privado" y "Vender Privado".

## Pruebas

Para probar el sistema:

1. **Como usuario normal**:
   - Ve a `/orders`
   - Selecciona la pestaña "Servicios"
   - Completa el formulario
   - Haz clic en "Solicitar Servicio"
   - Verás un mensaje de confirmación

2. **Como cajero/administrador**:
   - Ve a `/solicitudes-servicios`
   - Verás la solicitud pendiente
   - Puedes aprobarla o rechazarla
   - Si apruebas, el servicio se creará automáticamente
   - El usuario solicitante recibirá una notificación

## Notas Técnicas

- Las solicitudes pendientes se actualizan automáticamente al aprobar/rechazar
- El servicio creado sigue la misma lógica del módulo de servicios original
- Las anfitrionas quedan asignadas al servicio automáticamente
- La habitación se marca como ocupada al aprobar
- Todas las operaciones están protegidas con autenticación
- Los endpoints validan permisos de rol antes de ejecutar acciones
