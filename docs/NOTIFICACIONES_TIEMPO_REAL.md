# Sistema de Notificaciones en Tiempo Real

## Descripción General

Este sistema implementa notificaciones en tiempo real para pedidos utilizando Server-Sent Events (SSE). Cuando se crea un nuevo pedido, se envía una notificación inmediata a todos los clientes conectados.

## Características Principales

### ✅ Funcionalidades Implementadas

1. **Notificaciones en Tiempo Real**
   - Server-Sent Events (SSE) para comunicación instantánea
   - Reconexión automática con backoff exponencial
   - Manejo robusto de errores de conexión

2. **UI/UX Mejorada**
   - Notificaciones toast con diseño atractivo
   - Sonido de notificación generado programáticamente
   - Indicador de estado de conexión en el header
   - Dropdown con pedidos pendientes

3. **Gestión de Estado**
   - Hook personalizado para notificaciones SSE
   - Conteo de pedidos pendientes
   - Navegación directa a pedidos

## Arquitectura del Sistema

### Componentes Principales

```
📁 pages/api/notifications/
├── sse.ts              # Server-Sent Events endpoint
└── history.ts          # Historial de notificaciones

📁 hooks/
└── useNotifications.ts  # Hook para SSE

📁 components/notifications/
├── NotificationProvider.tsx # Provider de notificaciones
├── NotificationStatus.tsx   # Indicador de estado
└── index.ts

📁 scripts/
└── test-notifications.js    # Script de prueba
```

### Flujo de Notificaciones

1. **Creación de Pedido**
   ```
   OrderForm → API /api/orders → Crear pedido → Enviar SSE → Notificación en tiempo real
   ```

2. **Recepción de Notificación**
   ```
   SSE Client → useNotifications → Toast notification → Actualizar UI
   ```

## Configuración del Sistema

El sistema no requiere configuración de base de datos adicional ya que las notificaciones se manejan únicamente en tiempo real sin persistencia.

## API Endpoints

### GET /api/notifications/sse
Endpoint para Server-Sent Events
- **Headers**: `Content-Type: text/event-stream`
- **Eventos**: `connected`, `new_order`, `ping`

### GET /api/notifications/history
Obtener historial de notificaciones
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "codigo": "ABC123",
      "cliente": "Juan Pérez",
      "mesero": "María García",
      "total": 150.00,
      "timestamp": "2024-01-15T10:30:00Z"
    }
  ]
}
```



## Hooks Personalizados

### useNotifications()
Hook principal para SSE
```typescript
const { isConnected, connectionAttempts, lastNotification, reconnect } = useNotifications();
```

**Propiedades:**
- `isConnected`: Estado de conexión SSE
- `connectionAttempts`: Número de intentos de reconexión
- `lastNotification`: Última notificación recibida
- `reconnect`: Función para reconectar manualmente



## Componentes UI

### NotificationStatus
Indicador de estado de conexión en el header
```tsx
<NotificationStatus />
```

### NotificationProvider
Provider para inicializar notificaciones
```tsx
<NotificationProvider>
  <App />
</NotificationProvider>
```

## Configuración del Servidor

### Nginx (Opcional)
Para mejor rendimiento con nginx, agregar:
```nginx
location /api/notifications/sse {
    proxy_pass http://localhost:3000;
    proxy_http_version 1.1;
    proxy_set_header Connection "";
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header Host $http_host;
    proxy_cache_bypass $http_upgrade;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_read_timeout 86400;
}
```

## Monitoreo y Debugging

### Logs del Servidor
```bash
# Ver conexiones SSE activas
🔌 Nuevo cliente conectándose a SSE... ID: client_1234567890_abc123
✅ Cliente client_1234567890_abc123 agregado. Total de clientes conectados: 3

# Ver envío de notificaciones
📤 Enviando notificación new_order a 3 clientes: {...}
✅ Notificación enviada exitosamente a client_1234567890_abc123
```

### Logs del Cliente
```javascript
// En la consola del navegador
🚀 useNotifications hook iniciado
🔗 Iniciando conexión SSE (intento 1/5)...
✅ Conectado a notificaciones en tiempo real
📨 Evento SSE recibido: {...}
📢 Recibida notificación de nuevo pedido: {...}
```

## Optimizaciones Implementadas

### 1. Reconexión Inteligente
- Backoff exponencial (1s, 2s, 4s, 8s, 16s)
- Máximo 5 intentos de reconexión
- Reconexión automática al cambiar de pestaña

### 2. Limpieza de Conexiones
- Limpieza automática de conexiones muertas cada minuto
- Timeout de 5 minutos para conexiones inactivas
- Manejo de errores de escritura

### 3. Prevención de Duplicados
- ID único para cada notificación
- Verificación de notificaciones duplicadas
- Estado local para evitar re-renders innecesarios

### 4. Rendimiento
- Ping cada 15 segundos para mantener conexión
- Lazy loading de notificaciones
- Debouncing en operaciones de UI

## Troubleshooting

### Problemas Comunes

1. **Conexión SSE no establecida**
   - Verificar que el servidor esté corriendo en puerto 3000
   - Revisar logs del servidor para errores
   - Verificar configuración de nginx si se usa

2. **Notificaciones no aparecen**
   - Verificar que NotificationProvider esté montado
   - Revisar consola del navegador para errores
   - Verificar que el hook useNotifications esté activo

3. **Sonido no funciona**
   - Verificar permisos de audio del navegador
   - Interactuar con la página para habilitar audio
   - Revisar consola para errores de AudioContext

4. **Base de datos no actualizada**
   - Verificar que los procedimientos almacenados existan
   - Revisar permisos de la base de datos
   - Verificar logs de errores en la API

### Comandos de Debug

```bash
# Verificar conexiones SSE activas
curl -N http://localhost:3000/api/notifications/sse

# Verificar historial de notificaciones
curl http://localhost:3000/api/notifications/history
```

## Próximas Mejoras

### 🚀 Funcionalidades Futuras

1. **Notificaciones Push**
   - Integración con Service Workers
   - Notificaciones del sistema operativo
   - Soporte para dispositivos móviles

2. **Filtros y Búsqueda**
   - Filtrar por tipo de notificación
   - Búsqueda en historial
   - Paginación de notificaciones

3. **Configuración de Usuario**
   - Preferencias de notificación
   - Horarios de silencio
   - Tipos de notificación habilitados

4. **Analytics**
   - Métricas de entrega
   - Tiempo de respuesta
   - Estadísticas de uso

## Conclusión

El sistema de notificaciones en tiempo real está completamente implementado y optimizado para el manejo de pedidos. Proporciona una experiencia de usuario fluida con notificaciones inmediatas, persistencia de datos y manejo robusto de errores.

Para implementar en producción, asegúrate de:
1. Ejecutar el esquema SQL en la base de datos
2. Configurar nginx si es necesario
3. Monitorear los logs del servidor
4. Probar en diferentes navegadores y dispositivos 