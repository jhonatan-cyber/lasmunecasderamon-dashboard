# Manejo Automático de Sesión Expirada

## 🎯 Objetivo

Cuando la sesión del usuario expira, el sistema debe:
1. ✅ Detectar automáticamente el error 401
2. ✅ Mostrar notificación "Sesión expirada, debe ingresar con código de verificación"
3. ✅ Redirigir automáticamente al login
4. ✅ Preservar la URL para redirigir después del login

## 🔧 Implementación

### 1. Interceptor Global de Fetch

**Archivo**: `lib/fetchInterceptor.ts`

```typescript
// Intercepta TODAS las llamadas fetch en la aplicación
window.fetch = async (...args) => {
  const response = await originalFetch(...args);
  
  // Detecta error 401 (no autenticado)
  if (response.status === 401) {
    // Muestra notificación
    toast.error('Sesión expirada', {
      description: 'Debe ingresar con código de verificación'
    });
    
    // Redirige al login
    window.location.href = `/login?redirect=${currentPath}`;
  }
  
  return response;
};
```

**Características**:
- ✅ Intercepta todas las peticiones fetch
- ✅ Detecta errores 401 automáticamente
- ✅ Evita múltiples redirecciones
- ✅ Ignora rutas públicas (login, api-docs, etc.)
- ✅ Preserva la URL actual para redirección

### 2. Manejo en AuthContext

**Archivo**: `contexts/AuthContext.tsx`

```typescript
const handleSessionExpired = useCallback(() => {
  // Limpiar estado
  setUser(null);
  setUserPermissions([]);
  
  // Mostrar notificación
  toast.error('Sesión expirada', {
    description: 'Debe ingresar con código de verificación'
  });
  
  // Redirigir al login
  router.push(`/login?redirect=${pathname}`);
}, [pathname, router]);
```

**Características**:
- ✅ Limpia el estado del usuario
- ✅ Limpia los permisos
- ✅ Muestra notificación
- ✅ Redirige preservando la ruta

### 3. Inicialización

**Archivo**: `components/FetchInterceptorInit.tsx`

```typescript
export function FetchInterceptorInit() {
  useEffect(() => {
    setupFetchInterceptor();
  }, []);
  
  return null;
}
```

**Uso en Layout**:
```typescript
<ThemeProvider>
  <FetchInterceptorInit />
  <AuthProvider>
    {/* Resto de la app */}
  </AuthProvider>
</ThemeProvider>
```

## 📋 Flujo Completo

### Escenario 1: Sesión expira durante navegación

```
Usuario navega a /users
    ↓
fetch('/api/users') → 401 Unauthorized
    ↓
Interceptor detecta 401
    ↓
Muestra toast: "Sesión expirada, debe ingresar con código de verificación"
    ↓
Redirige a: /login?redirect=/users
    ↓
Usuario ingresa credenciales
    ↓
Redirige de vuelta a: /users
```

### Escenario 2: Sesión expira al cargar usuario

```
AuthContext intenta cargar usuario
    ↓
fetch('/api/auth/me') → 401 Unauthorized
    ↓
handleSessionExpired() se ejecuta
    ↓
Limpia estado (user = null, permissions = [])
    ↓
Muestra toast: "Sesión expirada..."
    ↓
Redirige a: /login?redirect=/dashboard
```

### Escenario 3: Múltiples peticiones fallan simultáneamente

```
fetch('/api/users') → 401
fetch('/api/products') → 401
fetch('/api/orders') → 401
    ↓
Interceptor detecta el primero
    ↓
Flag isRedirecting = true
    ↓
Ignora los siguientes 401
    ↓
Una sola notificación
    ↓
Una sola redirección
```

## 🛡️ Protecciones Implementadas

### 1. Evitar Múltiples Redirecciones
```typescript
let isRedirecting = false;

if (response.status === 401 && !isRedirecting) {
  isRedirecting = true;
  // Redirigir...
}
```

### 2. Ignorar Rutas Públicas
```typescript
const isPublicRoute = 
  currentPath === '/login' ||
  currentPath === '/api-docs' ||
  currentPath.startsWith('/confirmar-anulacion');

if (!isPublicRoute) {
  // Redirigir...
}
```

### 3. Resetear Flag en Login
```typescript
window.addEventListener('load', () => {
  if (window.location.pathname === '/login') {
    isRedirecting = false;
  }
});
```

### 4. Evitar Notificaciones Duplicadas
```typescript
const sessionExpiredShownRef = useRef(false);

const handleSessionExpired = () => {
  if (sessionExpiredShownRef.current) return;
  
  sessionExpiredShownRef.current = true;
  // Mostrar notificación...
  
  setTimeout(() => {
    sessionExpiredShownRef.current = false;
  }, 3000);
};
```

## 🧪 Casos de Prueba

### Caso 1: Sesión expira en página normal
```
1. Usuario está en /dashboard
2. Token expira
3. Usuario hace clic en "Usuarios"
4. fetch('/api/users') → 401
5. ✅ Muestra notificación
6. ✅ Redirige a /login?redirect=/users
```

### Caso 2: Sesión expira en página pública
```
1. Usuario está en /api-docs
2. Token expira
3. fetch('/api/something') → 401
4. ✅ NO muestra notificación (ya está en página pública)
5. ✅ NO redirige
```

### Caso 3: Múltiples peticiones fallan
```
1. Usuario está en /dashboard
2. Token expira
3. 5 peticiones simultáneas → todas 401
4. ✅ Muestra UNA notificación
5. ✅ Hace UNA redirección
```

### Caso 4: Usuario ya está en login
```
1. Usuario está en /login
2. Intenta login con credenciales incorrectas → 401
3. ✅ NO redirige (ya está en login)
4. ✅ Muestra error de credenciales incorrectas
```

## 📊 Códigos de Error Manejados

| Código | Descripción | Acción |
|--------|-------------|--------|
| `NO_TOKEN` | No hay token en la petición | Redirigir a login |
| `INVALID_TOKEN` | Token inválido o expirado | Redirigir a login |
| `401` | No autenticado | Redirigir a login |
| `403` | Sin permisos | Mostrar página de acceso denegado |

## 🔍 Debugging

### Ver interceptor en acción
```javascript
// En DevTools Console
console.log('Fetch original:', window.fetch.toString());
```

### Simular sesión expirada
```javascript
// En DevTools Console
fetch('/api/users').then(r => console.log(r.status));
// Si devuelve 401, verás la notificación y redirección
```

### Verificar flag de redirección
```javascript
// En lib/fetchInterceptor.ts, agregar:
console.log('isRedirecting:', isRedirecting);
```

## ⚙️ Configuración

### Personalizar mensaje de notificación
```typescript
// En lib/fetchInterceptor.ts
toast.error('Tu sesión ha expirado', {
  description: 'Por favor, inicia sesión nuevamente',
  duration: 5000, // 5 segundos
});
```

### Personalizar delay de redirección
```typescript
// En lib/fetchInterceptor.ts
setTimeout(() => {
  window.location.href = loginUrl;
}, 1000); // 1 segundo en lugar de 500ms
```

### Agregar más rutas públicas
```typescript
// En lib/fetchInterceptor.ts
const isPublicRoute = 
  currentPath === '/login' ||
  currentPath === '/api-docs' ||
  currentPath === '/nueva-ruta-publica' || // Agregar aquí
  currentPath.startsWith('/confirmar-anulacion');
```

## 🎨 Personalización de Notificación

### Estilo actual
```typescript
toast.error('Sesión expirada', {
  description: 'Debe ingresar con código de verificación',
  duration: 3000,
});
```

### Opciones disponibles
```typescript
toast.error('Título', {
  description: 'Descripción',
  duration: 3000,        // Duración en ms
  position: 'top-right', // Posición
  action: {              // Botón de acción
    label: 'Ir al login',
    onClick: () => router.push('/login')
  },
  cancel: {              // Botón de cancelar
    label: 'Cerrar',
    onClick: () => {}
  }
});
```

## 📝 Checklist de Implementación

- [x] Crear `lib/fetchInterceptor.ts`
- [x] Crear `components/FetchInterceptorInit.tsx`
- [x] Actualizar `contexts/AuthContext.tsx`
- [x] Agregar `FetchInterceptorInit` en `app/layout.tsx`
- [x] Agregar manejo de 401 en `fetchUser()`
- [x] Agregar manejo de 401 en `fetchPermissions()`
- [x] Implementar flag para evitar múltiples redirecciones
- [x] Implementar detección de rutas públicas
- [x] Agregar notificación con toast
- [x] Preservar URL para redirección post-login

## ✅ Resultado Final

Ahora cuando la sesión expire:

1. **Detección automática**: El sistema detecta el error 401 inmediatamente
2. **Notificación clara**: Muestra "Sesión expirada, debe ingresar con código de verificación"
3. **Redirección automática**: Lleva al usuario al login sin intervención manual
4. **Preserva contexto**: Guarda la URL para volver después del login
5. **Sin duplicados**: Una sola notificación y redirección, sin importar cuántas peticiones fallen

**Experiencia del usuario mejorada**: El usuario sabe exactamente qué pasó y qué debe hacer, sin confusión ni frustración.
