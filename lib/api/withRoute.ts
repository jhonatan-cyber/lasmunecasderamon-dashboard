import { ZodError } from 'zod';
import { NextResponse } from 'next/server';
import { getAuth } from '@/lib/auth/auth-app';
import { AuthenticatedUser, UserPermissions, isAdministrator } from '@/lib/middleware/auth';
import { ErrorLogService } from '@/modules/auditoria';
import { AuditService } from '@/modules/auditoria';
import { ApiResponse } from './api-response';
import { normalizeJsonResponseDates } from './date-response';
import { instantaneaPerfil, perfilActivo, reiniciarPerfil } from '@/lib/database/perfilConsultas';
import logger from '@/lib/utils/logger';

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
};

type AdministratorRouteConfig = {
  auth: true;
  access: 'administrator';
  module?: never;
  action?: never;
  audit?: boolean;
};

type SessionRouteConfig = {
  auth: true;
  access: 'authenticated';
  module?: never;
  action?: never;
  audit?: boolean;
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
  ) as RouteHandler;

  // ponytail: max request body size — 10 MB
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

  return async (request: Request, context: { params: any }): Promise<Response> => {
    try {
      let user: AuthenticatedUser | undefined;

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
      }

      // Auth check
      if (config.auth) {
        const authUser = await getAuth();
        if (!authUser) {
          return ApiResponse.unauthorized();
        }
        user = authUser;

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
              const clean: any = Array.isArray(obj) ? [] : {};
              for (const [k, v] of Object.entries(obj)) {
                if (sensitiveKeys.some(sk => k.toLowerCase().includes(sk))) {
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

      // `?perfil=1` reinicia la cuenta antes de ejecutar el handler, así que la cabecera
      // `x-lmr-consultas` que vuelve describe exactamente esta petición (y no el
      // acumulado del proceso). Sin `perfil=1` devuelve los acumulados, que es lo que
      // permite sacar deltas entre dos llamadas consecutivas.
      const pedirPerfil = perfilActivo() && new URL(request.url).searchParams.get('perfil') === '1';
      if (pedirPerfil) reiniciarPerfil();

      const response = await (handler as any)(request, handlerContext);
      const normalizada = await normalizeJsonResponseDates(response);
      // En desarrollo la respuesta dice cuántas consultas y cuántos ms de PostgreSQL lleva
      // acumulados: es lo que permite auditar un endpoint sin `pg_stat_statements`, que no
      // está disponible en esta instancia. En producción no se toca la respuesta.
      if (perfilActivo()) {
        normalizada.headers.set('x-lmr-consultas', JSON.stringify(instantaneaPerfil(pedirPerfil)));
      }
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
