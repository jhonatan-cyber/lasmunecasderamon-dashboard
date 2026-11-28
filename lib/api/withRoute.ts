import { ZodError } from 'zod';
import { runRegistration } from './registration';
import { NextResponse } from 'next/server';
import { getAuth, getAuthWithTimings } from '@/lib/auth/auth-app';
import { AuthenticatedUser, UserPermissions, isAdministrator } from '@/lib/middleware/auth';
import { ErrorLogService } from '@/modules/auditoria';
import { AuditService } from '@/modules/auditoria';
import { ApiResponse } from './api-response';
import { normalizeJsonResponseDates } from './date-response';
import { instantaneaPerfil, perfilActivo, reiniciarPerfil } from '@/lib/database/perfilConsultas';
import { sendNotificationToAll } from './sseService';
import logger from '@/lib/utils/logger';
import { runWithRequestId } from './request-id-context';
import { withRateLimit, rateLimiters } from './rateLimit';
import { sanitizeBody, scanForSQLInjection } from './sanitize';
import { addServerTimingMetric } from './server-timing';

// ── Types ──────────────────────────────────────────────────────────────

type RouteHandler = (request: Request, context: { params: any }) => Promise<Response>;

type AuthenticatedHandler = (
  request: Request,
  context: { params: any; user: AuthenticatedUser }
) => Promise<Response>;

type PermissionModule = keyof UserPermissions;

type RoutePermissions = { module: PermissionModule; action: string };

/**
 * Configuración de una ruta. Es una union discriminada a propósito: el tipo
 * obliga a declarar el nivel de acceso en lugar de dejar "cualquier sesion"
 * como comportamiento implicito.
 *
 *  - Ruta con permiso: auth + module + action (el administrador siempre pasa).
 *  - Ruta solo administrador: auth + access: 'administrator' (diagnostico,
 *    mantenimiento, cache).
 *  - Ruta de sesion: auth + access: 'authenticated'. Solo para endpoints que
 *    devuelven datos propios del usuario (su perfil, su asistencia, sus
 *    propinas). Es un opt-in explicito y greppable: nunca el valor por omision.
 *  - Ruta publica: sin auth.
 */
type PermissionRouteConfig<M extends PermissionModule = PermissionModule> = {
  auth: true;
  module: M;
  // La accion tiene que existir en ese modulo: 'rooms' + 'anulate' no compila.
  action: keyof UserPermissions[M] & string;
  access?: never;
  audit?: boolean;
  /** Solo para handlers transaccionales que pueden repetirse sin duplicar efectos. */
  retryFailedRegistration?: boolean;
};

type AdministratorRouteConfig = {
  auth: true;
  access: 'administrator';
  module?: never;
  action?: never;
  audit?: boolean;
  retryFailedRegistration?: boolean;
};

type SessionRouteConfig = {
  auth: true;
  access: 'authenticated';
  module?: never;
  action?: never;
  audit?: boolean;
  retryFailedRegistration?: boolean;
};

type PublicRouteConfig = {
  auth?: false;
  access?: never;
  module?: never;
  action?: never;
  audit?: boolean;
};

type RouteConfig<M extends PermissionModule = PermissionModule> =
  PermissionRouteConfig<M> | AdministratorRouteConfig | SessionRouteConfig | PublicRouteConfig;

// ── Helpers ─────────────────────────────────────────────────────────────

function isDbError(error: unknown): boolean {
  return (
    error instanceof Error &&
    /^(ETIMEDOUT|ECONNREFUSED|ECONNRESET|57P01|57P02|57P03|53300|08000|08003|08006)$/.test(
      (error as any).code ?? ''
    )
  );
}

function hasRequiredPermission(
  user: AuthenticatedUser,
  module: keyof UserPermissions,
  action: string
): boolean {
  if (isAdministrator(user)) return true;
  if (
    user.role?.toLowerCase() === 'barman' &&
    (module === 'sales' || module === 'advances' || (module === 'orders' && action === 'process'))
  )
    return false;
  const userPermissions = (user.permissions as any)?.[module];
  return !!(userPermissions && (userPermissions as any)[action] === true);
}

// ── Overload signatures ─────────────────────────────────────────────────

export function withRoute(
  handler: RouteHandler
): (request: Request, context: { params: any }) => Promise<Response>;

export function withRoute<M extends PermissionModule>(
  config: RouteConfig<M>,
  handler: AuthenticatedHandler
): (request: Request, context: { params: any }) => Promise<Response>;

// ── Implementation ──────────────────────────────────────────────────────

export function withRoute<M extends PermissionModule>(
  configOrHandler: RouteConfig<M> | RouteHandler,
  maybeHandler?: AuthenticatedHandler
): (request: Request, context: { params: any }) => Promise<Response> {
  // Normalise overloads. El cast es inevitable: el tipo del config es generico
  // en el modulo, y aqui solo se consultan los campos comunes.
  const config = (typeof configOrHandler === 'function' ? {} : configOrHandler) as RouteConfig;

  const handler = (
    typeof configOrHandler === 'function' ? configOrHandler : maybeHandler!
  ) as RouteHandler; // ponytail: max request body size — 10 MB
  const MAX_BODY_SIZE = 10 * 1024 * 1024;

  function sanitizeValue(value: unknown): unknown {
    if (typeof value === 'string') return value.replace(/[<>]/g, '');
    if (Array.isArray(value)) return value.map(sanitizeValue);
    if (value && typeof value === 'object') {
      const sanitized: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(value)) sanitized[k] = sanitizeValue(v);
      return sanitized;
    }
    return value;
  }

  // El compilador garantiza que module y action van juntos: si estan, la ruta
  // se verifica contra los permisos del rol.
  const requiredPermission: RoutePermissions | null =
    'module' in config && config.module
      ? { module: config.module, action: config.action as string }
      : null;

  const execute = async (
    request: Request,
    context: { params: any },
    requestId: string
  ): Promise<Response> => {
    const profileStages =
      process.env.NODE_ENV !== 'production' && request.headers.get('x-lmr-profile') === '1';
    let authDurationMs = 0;
    let handlerDurationMs = 0;
    let normalizeDurationMs = 0;
    let authTimings: Awaited<ReturnType<typeof getAuthWithTimings>>['timings'] | undefined;
    let authDatabaseProfile: ReturnType<typeof instantaneaPerfil> | undefined;

    try {
      let user: AuthenticatedUser | undefined;

      // ─── Rate Limiting ──────────────────────────────────────────────
      // Los endpoints de auth usan un límite más estricto para prevenir
      // fuerza bruta; las mutaciones usan un límite medio; el resto, general.
      const isAuthPath = /\/api\/auth\//.test(new URL(request.url).pathname);
      const limiter = isAuthPath
        ? rateLimiters.auth
        : ['POST', 'PUT', 'PATCH', 'DELETE'].includes(request.method)
          ? rateLimiters.mutation
          : rateLimiters.general;

      const rateLimitResult = withRateLimit(request, limiter);
      if (rateLimitResult?.response) {
        return rateLimitResult.response;
      }

      // ─── Input validation (all routes, not just auth'd) ────────────
      if (['POST', 'PUT', 'PATCH'].includes(request.method)) {
        const contentType = request.headers.get('content-type') || '';
        // Se acepta JSON y multipart (este último es necesario para subir archivos).
        if (
          contentType &&
          !contentType.includes('application/json') &&
          !contentType.includes('multipart/form-data')
        ) {
          return NextResponse.json(
            {
              success: false,
              message: 'Content-Type debe ser application/json o multipart/form-data',
              code: 'INVALID_CONTENT_TYPE'
            },
            { status: 400 }
          );
        }
        const contentLength = parseInt(request.headers.get('content-length') || '0', 10);
        if (contentLength > MAX_BODY_SIZE) {
          return NextResponse.json(
            {
              success: false,
              message: 'El cuerpo de la solicitud es demasiado grande',
              code: 'PAYLOAD_TOO_LARGE'
            },
            { status: 413 }
          );
        }
        // ponytail: URL query param sanitization (XSS)
        const url = new URL(request.url);
        for (const [key, value] of url.searchParams.entries()) {
          if (value.includes('<') || value.includes('>')) {
            url.searchParams.set(key, value.replace(/[<>]/g, ''));
          }
        }
        if (url.searchParams.toString() !== new URL(request.url).searchParams.toString()) {
          // Reconstruct request with sanitized URL
          const sanitizedUrl = url.toString();
          request = new Request(sanitizedUrl, request);
        }

        // Normalización limitada del body JSON y monitoreo heurístico SQL.
        // La detección solo alerta; los esquemas y SQL parametrizado son los controles.
        if (contentType.includes('application/json')) {
          try {
            const bodyPreview = await request.clone().json();
            const sqlWarnings = scanForSQLInjection(bodyPreview);
            if (sqlWarnings.length > 0) {
              logger.warn('[SQL_INJECTION_DETECTED]', {
                endpoint: `${request.method} ${url.pathname}`,
                fields: sqlWarnings,
                ip: request.headers.get('x-forwarded-for')
              });
            }
          } catch {
            // Si no se puede parsear JSON, el handler lo manejará
          }
        }
      }

      // Separa el SQL de autenticación del handler; el perfil global del proceso
      // solo permite atribuirlo correctamente en solicitudes secuenciales.
      const pedirPerfil = perfilActivo() && new URL(request.url).searchParams.get('perfil') === '1';
      if (pedirPerfil) reiniciarPerfil();

      // Auth check
      const authStartedAt = profileStages ? performance.now() : 0;
      if (config.auth) {
        const authResult = profileStages ? await getAuthWithTimings() : undefined;
        const authUser = authResult?.user ?? (profileStages ? null : await getAuth());
        if (!authUser) {
          return ApiResponse.unauthorized();
        }
        user = authUser;
        authTimings = authResult?.timings;

        // Rutas exclusivas del administrador (diagnostico y mantenimiento)
        if (config.access === 'administrator' && !isAdministrator(user)) {
          return ApiResponse.forbidden('Solo el administrador puede acceder a este recurso');
        }

        // Permission check
        if (requiredPermission) {
          if (!hasRequiredPermission(user, requiredPermission.module, requiredPermission.action)) {
            return ApiResponse.forbidden('Permisos insuficientes');
          }
        }
      }
      if (profileStages) authDurationMs = performance.now() - authStartedAt;
      if (pedirPerfil) {
        authDatabaseProfile = instantaneaPerfil();
        reiniciarPerfil();
      }

      // Audit logging for mutating methods
      if (config.audit && user && ['POST', 'PUT', 'DELETE', 'PATCH'].includes(request.method)) {
        const url = new URL(request.url);
        const forwarded = request.headers.get('x-forwarded-for');
        const ip = forwarded ? forwarded.split(',')[0] : 'unknown';

        let body: any = null;
        try {
          body = await request.clone().json();
          if (body) {
            const sensitiveKeys = [
              'password',
              'token',
              'contrasena',
              'contraseña',
              'jwt',
              'secret'
            ];
            const sanitize = (obj: any): any => {
              if (!obj || typeof obj !== 'object') return obj;
              // Configuraciones guarda secretos como { clave, valor }, no como
              // propiedades con el nombre del secreto.
              const secretConfig =
                typeof obj.clave === 'string' &&
                sensitiveKeys.some(sk => obj.clave.toLowerCase().includes(sk));
              const clean: any = Array.isArray(obj) ? [] : {};
              for (const [k, v] of Object.entries(obj)) {
                if (
                  (secretConfig && k === 'valor') ||
                  sensitiveKeys.some(sk => k.toLowerCase().includes(sk))
                ) {
                  clean[k] = '***';
                } else if (typeof v === 'object') {
                  clean[k] = sanitize(v);
                } else {
                  clean[k] = v;
                }
              }
              return clean;
            };
            body = sanitize(body);
          }
        } catch {}

        // Fire-and-forget: don't block the response
        AuditService.log({
          user_id: user.id,
          action: `${request.method} ${url.pathname}`,
          resource_type: requiredPermission?.module ?? 'system',
          ip_address: ip,
          details: { params: await context.params, body }
        }).catch((e: unknown) => logger.captureException(e, { context: 'withRoute:audit' }));
      }

      // Build final context and call handler
      const params = await context.params;
      const handlerContext = config.auth
        ? { ...context, params, user: user! }
        : { ...context, params };

      const invoke = (nextRequest: Request) => (handler as any)(nextRequest, handlerContext);
      const handlerStartedAt = profileStages ? performance.now() : 0;
      const response = user
        ? await runRegistration(request, String(user.id), invoke, {
            retryFailed:
              'retryFailedRegistration' in config ? config.retryFailedRegistration : undefined
          })
        : await invoke(request);
      if (profileStages) handlerDurationMs = performance.now() - handlerStartedAt;
      const normalizeStartedAt = profileStages ? performance.now() : 0;
      const normalizada = await normalizeJsonResponseDates(response);
      if (profileStages) normalizeDurationMs = performance.now() - normalizeStartedAt;
      if (
        normalizada.ok &&
        ['POST', 'PUT', 'PATCH', 'DELETE'].includes(request.method) &&
        /^\/api\/(products|bar|purchases|sales|transfers|orders|cuentas|servicios|returns)(\/|$)/.test(
          new URL(request.url).pathname
        )
      ) {
        try {
          const { revisarReposicion } = await import('@/modules/inventario');
          await revisarReposicion();
        } catch (error) {
          logger.captureException(error, { context: 'stock:replenishment' });
        }
      }

      // Toda mutación auditada y exitosa avisa qué módulo cambió: es la señal que permite
      // refrescar en vivo las vistas de administración (productos, clientes, usuarios,
      // roles, habitaciones...) sin emisores dedicados en cada endpoint. Fire-and-forget.
      if (
        user &&
        requiredPermission &&
        normalizada.ok &&
        ['POST', 'PUT', 'PATCH', 'DELETE'].includes(request.method)
      ) {
        try {
          sendNotificationToAll('resource_updated', { module: requiredPermission.module });
        } catch (sseError) {
          logger.captureException(sseError, { context: 'withRoute:sse' });
        }
      }

      // En desarrollo la respuesta dice cuántas consultas y cuántos ms de PostgreSQL lleva
      // acumulados: es lo que permite auditar un endpoint sin `pg_stat_statements`, que no
      // está disponible en esta instancia. En producción no se toca la respuesta.
      if (perfilActivo()) {
        normalizada.headers.set('x-lmr-consultas', JSON.stringify(instantaneaPerfil(pedirPerfil)));
      }
      if (pedirPerfil && authDatabaseProfile) {
        normalizada.headers.set('x-lmr-auth-consultas', JSON.stringify(authDatabaseProfile));
      }
      if (profileStages) {
        addServerTimingMetric(normalizada, request, 'auth', authDurationMs);
        if (authTimings) {
          addServerTimingMetric(normalizada, request, 'auth-token', authTimings.token);
          addServerTimingMetric(normalizada, request, 'auth-jwt', authTimings.jwt);
          addServerTimingMetric(normalizada, request, 'auth-session', authTimings.session);
          addServerTimingMetric(normalizada, request, 'auth-permissions', authTimings.permissions);
        }
        addServerTimingMetric(normalizada, request, 'handler', handlerDurationMs);
        addServerTimingMetric(normalizada, request, 'normalize', normalizeDurationMs);
      }
      // Request ID en la respuesta para trazabilidad del cliente
      normalizada.headers.set('x-request-id', requestId);
      return normalizada;
    } catch (error: unknown) {
      const url = new URL(request.url);
      const method = request.method;
      const message = error instanceof Error ? error.message : 'Error desconocido';
      const stack = error instanceof Error ? error.stack : undefined;

      logger.error(`[APP API ERROR] ${method} ${url.pathname}`, {
        message,
        stack
      });

      // Log to DB unless it's a connection error
      if (!isDbError(error)) {
        ErrorLogService.log({
          endpoint: `${method} ${url.pathname}`,
          error_message: message,
          stack_trace: stack
        }).catch((e: unknown) => logger.captureException(e, { context: 'withRoute:logError' }));
      }

      if (error instanceof ZodError) {
        return ApiResponse.validationError(
          'Error de validación de datos',
          error.issues.map(e => ({
            path: e.path.join('.'),
            message: e.message
          }))
        );
      }

      return ApiResponse.error(error);
    }
  };

  return (request, context) =>
    runWithRequestId(request.headers.get('x-request-id'), requestId =>
      execute(request, context, requestId)
    );
}

// Re-export convenience for routes that don't need the full config object
export function withPublicRoute(
  handler: RouteHandler
): (request: Request, context: { params: any }) => Promise<Response> {
  return withRoute({}, handler);
}

export function withAuthRoute<M extends PermissionModule>(
  handler: AuthenticatedHandler,
  permissions: { module: M; action: keyof UserPermissions[M] & string }
): (request: Request, context: { params: any }) => Promise<Response> {
  return withRoute(
    {
      auth: true,
      module: permissions.module,
      action: permissions.action,
      audit: true
    },
    handler
  );
}
