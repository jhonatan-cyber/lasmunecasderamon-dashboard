# Guía de Integración con Sentry

## Overview

Sentry proporciona monitoreo de errores en tiempo real, alertas automáticas y
trazabilidad de stack traces para producción.

## Instalación

```bash
npm install @sentry/nextjs
```

## Configuración

### 1. Crear `sentry.server.config.ts`

```typescript
// sentry.server.config.ts
import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,

  // Integración con logs existentes
  beforeSend(event) {
    // No enviar errores de desarrollo
    if (process.env.NODE_ENV === 'development') return null;
    // Enrich con request ID si existe
    return event;
  },

  // Ignorar errores esperados
  ignoreErrors: ['Network Error', 'Failed to fetch', 'chunk-load-error']
});
```

### 2. Crear `sentry.client.config.ts`

```typescript
// sentry.client.config.ts
import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 0.1,
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,

  integrations: [Sentry.browserTracingIntegration(), Sentry.replayIntegration()]
});
```

### 3. Crear `sentry.edge.config.ts`

```typescript
// sentry.edge.config.ts
import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 0.1
});
```

### 4. Actualizar `lib/utils/logger.ts`

```typescript
import * as Sentry from '@sentry/nextjs';

export function captureException(
  error: unknown,
  context?: Record<string, unknown>
) {
  // Log existente
  logger.error('Exception captured', { error, ...context });
  // Sentry
  Sentry.captureException(error, { tags: context });
}
```

### 5. Actualizar `lib/api/withRoute.ts`

```typescript
import * as Sentry from '@sentry/nextjs';

// En el catch block:
catch (error: unknown) {
  Sentry.captureException(error, {
    tags: {
      endpoint: `${method} ${url.pathname}`,
      userId: user?.id,
    },
    user: {
      id: user?.id,
      email: user?.email,
    },
  });
  // ... resto del manejo de errores
}
```

## Variables de entorno

```bash
# .env.production
SENTRY_DSN=https://your-project@sentry.io/your-project-id
SENTRY_AUTH_TOKEN=your-auth-token
SENTRY_ORG=your-org
SENTRY_PROJECT=dashboard
```

## Source Maps

### Opción 1: Sentry CLI (recomendado)

```json
// package.json
{
  "scripts": {
    "build": "next build && sentry-cli sourcemaps inject ./.next && sentry-cli sourcemaps upload ./.next"
  }
}
```

### Opción 2: Sentry Wizard

```bash
npx @sentry/wizard -i nextjs
```

El wizard configura automáticamente:

- Archivos de configuración
- Source maps upload
- CI/CD integration
- Error monitoring

## Alertas

### Configurar en Sentry Dashboard

1. **Alertas de error**: Notificar cuando un error nuevo aparece
2. **Alertas de frecuencia**: Notificar cuando un error supera X ocurrencias en
   Y minutos
3. **Alertas de rendimiento**: Notificar cuando p95 > 2s

### Canales de notificación

- **Slack**: Integrar con canal #alerts
- **Email**: Para errores críticos
- **WhatsApp**: Para el equipo de operaciones (vía webhook)

## Monitoreo de rendimiento

### Transactions a monitorear

```typescript
// En endpoints críticos:
import * as Sentry from '@sentry/nextjs';

export const POST = withRoute(
  { auth: true, module: 'sales', action: 'write' },
  async (request: Request) => {
    const transaction = Sentry.startTransaction({ name: 'POST /api/sales' });
    Sentry.configureScope(scope => scope.setSpan(transaction));

    try {
      // ... lógica del endpoint
      return NextResponse.json({ success: true });
    } finally {
      transaction.finish();
    }
  }
);
```

### Endpoints prioritarios

1. `POST /api/sales` — Creación de ventas
2. `POST /api/services` — Creación de servicios
3. `POST /api/orders` — Pedidos de meseros
4. `POST /api/cashregister` — Apertura de caja
5. `DELETE /api/cashregister` — Cierre de caja
6. `POST /api/auth/login` — Autenticación

## Beneficios

1. **Detección temprana**: Los errores se detectan cuando ocurren, no cuando el
   usuario los reporta
2. **Contexto completo**: Stack traces, variables, usuario, endpoint, request ID
3. **Alertas automáticas**: Notificaciones en tiempo real para errores críticos
4. **Tendencias**: Ver la frecuencia de errores a lo largo del tiempo
5. **Performance**: Identificar endpoints lentos y optimizarlos

## Alternativas

- **Datadog**: Más completo pero más caro
- **New Relic**: Bueno para APM, menos para errores
- **LogRocket**: Enfocado en replay de sesiones
- **Better Stack**: Alternativa más económica a Sentry
