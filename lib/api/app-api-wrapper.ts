import { logger } from '@/lib/utils/logger';
import { ZodError } from 'zod';
import { ErrorLogRepository } from '@/lib/repositories/ErrorLogRepository';
import { AuditRepository } from '@/lib/repositories/AuditRepository';
import { getAuth } from '@/lib/auth/auth-app';
import { AuthenticatedUser, UserPermissions } from '@/lib/middleware/auth';
import { ApiResponse } from './api-response';

type AppRouteHandler = (
  request: Request,
  context: { params: any }
) => Promise<Response>;

type AuthenticatedAppRouteHandler = (
  request: Request,
  context: { params: any; user: AuthenticatedUser }
) => Promise<Response>;

export function withAppApiWrapper(handler: AppRouteHandler) {
  return async (request: Request, context: { params: any }) => {
    try {
      return await handler(request, context);
    } catch (error: any) {
      const url = new URL(request.url);
      const method = request.method;

      logger.error(`[APP API ERROR] ${method} ${url.pathname}`, {
        message: error.message,
        stack: error.stack,
        params: context.params,
      });

      try {
        await ErrorLogRepository.log({
          endpoint: `${method} ${url.pathname}`,
          error_message: error.message,
          stack_trace: error.stack
        });
      } catch (logError) {
        console.error('Failed to log error to database:', logError);
      }

      if (error instanceof ZodError) {
        return ApiResponse.validationError('Error de validación de datos', error.issues.map((e) => ({
          path: e.path.join('.'),
          message: e.message,
        })));
      }

      return ApiResponse.error(error);
    }
  };
}

export function withAppAuth(
  handler: AuthenticatedAppRouteHandler,
  requiredPermission?: { module: keyof UserPermissions; action: string }
) {
  return withAppApiWrapper(async (request: Request, context: { params: any }) => {
    const user = await getAuth();

    if (!user) {
      return ApiResponse.unauthorized();
    }
    if (requiredPermission) {
      const isAdministrator = user.role?.toLowerCase() === 'administrador';

      const { module, action } = requiredPermission;
      const userPermissions = (user.permissions as any)?.[module];

      const hasPermission = isAdministrator || (userPermissions && (userPermissions as any)[action] === true);

      if (!hasPermission) {
        return ApiResponse.unauthorized('Permisos insuficientes');
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
          details: { params: context.params }
        });
      } catch (auditError) {
        console.error('Error recording audit log:', auditError);
      }
    }

    return handler(request, { ...context, user });
  });
}
