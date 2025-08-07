# 🔐 Implementación de Seguridad y Autenticación

## Resumen de Mejoras Implementadas

Este documento describe las mejoras de seguridad implementadas en el sistema Admin Dashboard, incluyendo rate limiting, logging de auditoría, validación de permisos granular y headers de seguridad.

## 📋 Componentes Implementados

### 1. Sistema de Logging (`lib/logger.ts`)

**Características:**
- Logs estructurados con Winston
- Separación por niveles (error, info, warn)
- Logs de auditoría específicos
- Rotación automática de archivos
- Formato JSON para fácil parsing

**Archivos generados:**
- `logs/error.log` - Errores del sistema
- `logs/combined.log` - Todos los logs
- `logs/audit.log` - Logs de auditoría

**Funciones de auditoría:**
```typescript
auditLogger.login(userId, ip, success)
auditLogger.logout(userId, ip)
auditLogger.dataAccess(userId, action, resource, details)
auditLogger.securityEvent(userId, event, details)
auditLogger.error(error, context)
```

### 2. Rate Limiting (`lib/middleware/rateLimit.ts`)

**Tipos de limitadores:**
- `generalLimiter`: 100 requests/15min por IP
- `loginLimiter`: 5 intentos/15min para login
- `sensitiveApiLimiter`: 20 requests/5min para APIs sensibles
- `uploadLimiter`: 10 uploads/hora
- `ipBasedLimiter`: 30 requests/minuto por IP

**Configuración:**
```typescript
export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 5, // máximo 5 intentos
  message: { error: 'Demasiados intentos de login' }
});
```

### 3. Autenticación Mejorada (`lib/middleware/auth.ts`)

**Características:**
- Validación de permisos granular
- Roles con permisos específicos
- Logging de auditoría automático
- Tipos TypeScript robustos

**Roles y Permisos:**
```typescript
const rolePermissions = {
  administrador: {
    users: { read: true, write: true, delete: true },
    sales: { read: true, write: true, delete: true, anulate: true },
    // ... más permisos
  },
  cajero: {
    users: { read: false, write: false, delete: false },
    // ... permisos limitados
  },
  garzon: {
    users: { read: false, write: false, delete: false },
    // ... permisos mínimos
  },
  anfitriona: {
    users: { read: false, write: false, delete: false },
    // ... permisos mínimos
  }
};
```

**Middleware disponibles:**
- `withAuth()` - Autenticación básica
- `withPermission(permission, action)` - Validación de permisos
- `withRole(allowedRoles)` - Validación de roles
- `checkPermission(user, permission, action)` - Verificación en código

### 4. Headers de Seguridad (`lib/middleware/security.ts`)

**Headers implementados:**
```typescript
const securityHeaders = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
  'Content-Security-Policy': "default-src 'self'; ..."
};
```

**Funcionalidades:**
- Sanitización de entrada
- Validación de métodos HTTP
- Validación de origen (CORS)
- Logging de requests
- Validación de tamaño de payload

## 🚀 Uso de las Mejoras

### 1. API de Login Protegida

```typescript
// pages/api/login.ts
export default withRateLimit(loginLimiter)(
  validateMethod(['POST'])(
    withSecurity(loginHandler)
  )
);
```

### 2. API con Permisos Granulares

```typescript
// pages/api/users-secure.ts
export default withRateLimit(sensitiveApiLimiter)(
  validateMethod(['GET', 'POST', 'PUT', 'DELETE'])(
    withPermission('users', 'read')(
      withSecurity(usersSecureHandler)
    )
  )
);
```

### 3. Logging de Auditoría

```typescript
// En cualquier API
auditLogger.dataAccess(userId, 'CREATE', 'users', {
  newUserId: result.insertId,
  username,
  email,
  ip: clientIP
});
```

## 📊 Monitoreo y Alertas

### Logs de Seguridad

Los siguientes eventos se registran automáticamente:

1. **Intentos de Login:**
   - Exitosos y fallidos
   - IP del cliente
   - User-Agent
   - Timestamp

2. **Acceso a Datos:**
   - Usuario que accede
   - Recurso accedido
   - Acción realizada
   - IP del cliente

3. **Eventos de Seguridad:**
   - Rate limit excedido
   - Permisos denegados
   - Tokens inválidos
   - Intentos de acceso no autorizado

### Códigos de Error Estandarizados

```typescript
// Códigos implementados
'NO_TOKEN'           // Token no proporcionado
'INVALID_TOKEN'      // Token inválido o expirado
'INSUFFICIENT_PERMISSIONS'  // Permisos insuficientes
'INSUFFICIENT_ROLE'  // Rol insuficiente
'RATE_LIMIT_EXCEEDED'  // Rate limit excedido
'LOGIN_RATE_LIMIT_EXCEEDED'  // Rate limit de login
'PAYLOAD_TOO_LARGE'  // Payload demasiado grande
'INVALID_CONTENT_TYPE'  // Content-Type inválido
'METHOD_NOT_ALLOWED'  // Método HTTP no permitido
```

## 🔧 Configuración

### Variables de Entorno Requeridas

```env
# JWT
JWT_SECRET=tu_secreto_super_seguro_aqui

# Base de datos
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=
DB_NAME=admin_dashboard
DB_PORT=3306

# Entorno
NODE_ENV=development
```

### Estructura de Directorios

```
lib/
├── logger.ts              # Sistema de logging
├── middleware/
│   ├── auth.ts           # Autenticación y permisos
│   ├── rateLimit.ts      # Rate limiting
│   └── security.ts       # Headers y validación
logs/
├── error.log             # Errores del sistema
├── combined.log          # Todos los logs
└── audit.log            # Logs de auditoría
```

## 🛡️ Beneficios de Seguridad

### 1. Protección contra Ataques
- **Rate Limiting**: Previene ataques de fuerza bruta
- **Headers de Seguridad**: Protege contra XSS, CSRF, clickjacking
- **Sanitización**: Previene inyección de código
- **Validación**: Asegura integridad de datos

### 2. Auditoría Completa
- **Logs Estructurados**: Fácil análisis y búsqueda
- **Trail de Auditoría**: Rastro completo de acciones
- **Alertas**: Detección de actividades sospechosas
- **Compliance**: Cumplimiento de regulaciones

### 3. Control de Acceso Granular
- **Roles Específicos**: Permisos por función
- **Validación en Tiempo Real**: Verificación automática
- **Prevención de Elevación**: Control de privilegios
- **Segregación de Responsabilidades**: Acceso mínimo necesario

## 📈 Métricas de Seguridad

### KPIs a Monitorear

1. **Intentos de Login Fallidos**
   - Por IP
   - Por usuario
   - Por hora/día

2. **Rate Limiting**
   - Requests bloqueados
   - IPs más activas
   - Patrones sospechosos

3. **Acceso a Datos**
   - Recursos más accedidos
   - Usuarios más activos
   - Horarios de actividad

4. **Errores de Seguridad**
   - Tokens inválidos
   - Permisos denegados
   - Payloads malformados

## 🔄 Próximos Pasos

### Mejoras Futuras

1. **Autenticación de Dos Factores (2FA)**
   - Implementar TOTP
   - SMS/Email como backup
   - QR codes para configuración

2. **Encriptación de Datos Sensibles**
   - Encriptar información personal
   - Encriptar datos financieros
   - Claves de encriptación rotativas

3. **Sistema de Alertas**
   - Notificaciones en tiempo real
   - Dashboard de seguridad
   - Reportes automáticos

4. **Backup y Recuperación**
   - Backup automático de logs
   - Recuperación de datos
   - Plan de contingencia

## 📚 Referencias

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [JWT Security Best Practices](https://auth0.com/blog/a-look-at-the-latest-draft-for-jwt-bcp/)
- [Rate Limiting Strategies](https://cloud.google.com/architecture/rate-limiting-strategies-techniques)
- [Security Headers](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers#security)

---

**Nota:** Esta implementación proporciona una base sólida de seguridad que puede expandirse según las necesidades específicas del negocio. 