import { ZodError } from 'zod';
import { NextResponse } from 'next/server';
import { getAuth } from '@/lib/auth/auth-app';
import { AuthenticatedUser, UserPermissions } from '@/lib/middleware/auth';
import { ErrorLogService } from '@/lib/services/ErrorLogService';
import { AuditService } from '@/lib/services/AuditService';
import { ApiResponse } from './api-response';
import { normalizeJsonResponseDates } from './date-response';
import logger from '@/lib/utils/logger';

// ── Types ──────────────────────────────────────────────────────────────

type RouteHandler = (request: Request, context: { params: any }) => Promise<Response>;

type AuthenticatedHandler = (
  request: Request,
  context: { params: any; user: AuthenticatedUser }
) => Promise<Response>;

type RoutePermissions = { module: keyof UserPermissions; action: string };

type RouteConfig = {
  auth?: boolean;
  module?: keyof UserPermissions;
  action?: string;
  audit?: boolean;
};

// ── Helpers ─────────────────────────────────────────────────────────────

function isDbError(error: unknown): boolean {
  return (
    error instanceof Error &&
    /^(ETIMEDOUT|ECONNREFUSED|ECONNRESET|PROTOCOL_CONNECTION_LOST|ER_CON_COUNT_ERROR|POOL_CLOSED)$/.test(
      (error as any).code ?? ''
    )
  );
}

function hasRequiredPermission(
  user: AuthenticatedUser,
  module: keyof UserPermissions,
  action: string
): boolean {
  if (user.role?.toLowerCase() === 'administrador') return true;
  const userPermissions = (user.permissions as any)?.[module];
  return !!(userPermissions && (userPermissions as any)[action] === true);
}

// ── Overload signatures ─────────────────────────────────────────────────

export function withRoute(
  handler: RouteHandler
): (request: Request, context: { params: any }) => Promise<Response>;

export function withRoute(
  config: RouteConfig,
  handler: AuthenticatedHandler
): (request: Request, context: { params: any }) => Promise<Response>;

// ── Implementation ──────────────────────────────────────────────────────

export function withRoute(
  configOrHandler: RouteConfig | RouteHandler,
  maybeHandler?: AuthenticatedHandler
): (request: Request, context: { params: any }) => Promise<Response> {
  // Normalise overloads
  const config: RouteConfig = typeof configOrHandler === 'function' ? {} : configOrHandler;

  const handler = (
    typeof configOrHandler === 'function' ? configOrHandler : maybeHandler!
  ) as RouteHandler;

  return async (request: Request, context: { params: any }): Promise<Response> => {
    try {
      let user: AuthenticatedUser | undefined;

      // Auth check
      if (config.auth) {
        const authUser = await getAuth();
        if (!authUser) {
          return ApiResponse.unauthorized();
        }
        user = authUser;

        // Permission check
        if (config.module && config.action) {
          if (!hasRequiredPermission(user, config.module, config.action)) {
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
          resource_type: (config.module as string) || 'system',
          ip_address: ip,
          details: { params: await context.params, body }
        }).catch((e: unknown) => logger.captureException(e, { context: 'withRoute:audit' }));
      }

      // Build final context and call handler
      const params = await context.params;
      const handlerContext = config.auth
        ? { ...context, params, user: user! }
        : { ...context, params };

      const response = await (handler as any)(request, handlerContext);
      return await normalizeJsonResponseDates(response);
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

export function withAuthRoute(
  handler: AuthenticatedHandler,
  permissions?: RoutePermissions
): (request: Request, context: { params: any }) => Promise<Response> {
  return withRoute(
    {
      auth: true,
      module: permissions?.module,
      action: permissions?.action,
      audit: true
    },
    handler
  );
}
