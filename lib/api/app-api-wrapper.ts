import { ZodError } from 'zod';
import { ErrorLogRepository } from '@/lib/repositories/ErrorLogRepository';
import { AuditRepository } from '@/lib/repositories/AuditRepository';
import { getAuth } from '@/lib/auth/auth-app';
import { AuthenticatedUser, UserPermissions } from '@/lib/middleware/auth';
import { ApiResponse } from './api-response';
import { normalizeJsonResponseDates } from './date-response';
import logger from '@/lib/utils/logger';

type AppRouteHandler = (request: Request, context: { params: any }) => Promise<Response>;

type AuthenticatedAppRouteHandler = (
  request: Request,
  context: { params: any; user: AuthenticatedUser }
) => Promise<Response>;

type RequiredPermission = { module: keyof UserPermissions; action: string };
type WithAppAuthOptions = { requiredPermission?: RequiredPermission };

function resolveRequiredPermission(
  permissionOrOptions?: RequiredPermission | WithAppAuthOptions
): RequiredPermission | undefined {
  if (!permissionOrOptions) return undefined;
  return 'requiredPermission' in permissionOrOptions
    ? permissionOrOptions.requiredPermission
    : (permissionOrOptions as RequiredPermission);
}

export function withAppApiWrapper(handler: AppRouteHandler) {
  return async (request: Request, context: { params: any }) => {
    try {
      const response = await handler(request, context);
      return await normalizeJsonResponseDates(response);
    } catch (error: unknown) {
      const url = new URL(request.url);
      const method = request.method;
      const params = await context.params;
      const message = error instanceof Error ? error.message : 'Error desconocido';
      const stack = error instanceof Error ? error.stack : undefined;

      logger.error(`[APP API ERROR] ${method} ${url.pathname}`, {
        message,
        stack,
        params
      });

      try {
        await ErrorLogRepository.log({
          endpoint: `${method} ${url.pathname}`,
          error_message: message,
          stack_trace: stack
        });
      } catch (logError) {
        logger.captureException(logError, { context: 'AppApiWrapper:logError' });
      }

      if (error instanceof ZodError) {
        return ApiResponse.validationError(
          'Error de validación de datos',
          error.issues.map((e: any) => ({
            path: e.path.join('.'),
            message: e.message
          }))
        );
      }

      return ApiResponse.error(error);
    }
  };
}

export function withAppAuth(
  handler: AuthenticatedAppRouteHandler,
  permissionOrOptions?: RequiredPermission | WithAppAuthOptions
) {
  const requiredPermission = resolveRequiredPermission(permissionOrOptions);
  return withAppApiWrapper(async (request: Request, context: { params: any }) => {
    const user = await getAuth();

    if (!user) {
      return ApiResponse.unauthorized();
    }

    const params = await context.params;

    if (requiredPermission) {
      const isAdministrator = user.role?.toLowerCase() === 'administrador';

      const { module, action } = requiredPermission;
      const userPermissions = (user.permissions as any)?.[module];

      const hasPermission =
        isAdministrator || (userPermissions && (userPermissions as any)[action] === true);

      if (!hasPermission) {
        return ApiResponse.forbidden('Permisos insuficientes');
      }
    }

    if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(request.method)) {
      try {
        const url = new URL(request.url);
        const forwarded = request.headers.get('x-forwarded-for');
        const ip = forwarded ? forwarded.split(',')[0] : 'unknown';

        await AuditRepository.log({
          user_id: user.id,
          action: `${request.method} ${url.pathname}`,
          resource_type: requiredPermission?.module || 'system',
          ip_address: ip,
          details: { params }
        });
      } catch (auditError) {
        logger.captureException(auditError, { context: 'AppApiWrapper:auditError' });
      }
    }

    return handler(request, { ...context, params: Promise.resolve(params), user });
  });
}
