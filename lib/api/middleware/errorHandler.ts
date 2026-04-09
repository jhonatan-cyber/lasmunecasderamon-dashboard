import { NextResponse } from 'next/server';
import {
  AppError,
  ValidationError,
  AuthError,
  DatabaseError,
  formatErrorResponse
} from '@/lib/errors/errors';
import { logger } from '@/lib/utils/logger';

export type ErrorType = 'validation' | 'database' | 'auth' | 'unknown';

export interface ApiErrorResponse {
  success: false;
  message: string;
  error: {
    code: string;
    message: string;
    type?: ErrorType;
    details?: unknown;
  };
}

export function handleApiError(error: unknown, context?: string): NextResponse<ApiErrorResponse> {
  const errorId = `ERR-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  if (error instanceof AppError) {
    const response: ApiErrorResponse = {
      success: false,
      message: error.message,
      error: {
        code: error.code,
        message: error.message,
        type: getErrorType(error),
        details: error.details
      }
    };

    logger.error(`[API Error] ${errorId} | ${error.code} | ${context || 'unknown'}`, {
      errorId,
      code: error.code,
      statusCode: error.statusCode,
      message: error.message,
      details: error.details,
      context
    });

    return NextResponse.json(response, { status: error.statusCode });
  }

  if (error instanceof ValidationError) {
    const response: ApiErrorResponse = {
      success: false,
      message: error.message,
      error: {
        code: error.code,
        message: error.message,
        type: 'validation',
        details: error.details
      }
    };

    logger.warn(`[API Validation Error] ${errorId} | ${context || 'unknown'}`, {
      errorId,
      message: error.message,
      details: error.details,
      context
    });

    return NextResponse.json(response, { status: error.statusCode });
  }

  if (error instanceof AuthError) {
    const response: ApiErrorResponse = {
      success: false,
      message: error.message,
      error: {
        code: error.code,
        message: error.message,
        type: 'auth'
      }
    };

    logger.warn(`[API Auth Error] ${errorId} | ${error.code} | ${context || 'unknown'}`, {
      errorId,
      code: error.code,
      message: error.message,
      context
    });

    return NextResponse.json(response, { status: error.statusCode });
  }

  if (error instanceof DatabaseError) {
    const response: ApiErrorResponse = {
      success: false,
      message: 'Error en la base de datos',
      error: {
        code: 'DATABASE_ERROR',
        message: 'Error en la base de datos',
        type: 'database',
        details: error.message
      }
    };

    logger.error(`[API Database Error] ${errorId} | ${context || 'unknown'}`, {
      errorId,
      message: error.message,
      originalError: error.details,
      context
    });

    return NextResponse.json(response, { status: 500 });
  }

  const formatted = formatErrorResponse(error);

  logger.error(`[API Unknown Error] ${errorId} | ${context || 'unknown'}`, {
    errorId,
    error: error instanceof Error ? error.message : String(error),
    stack: error instanceof Error ? error.stack : undefined,
    context
  });

  return NextResponse.json(formatted as any, { status: 500 });
}

function getErrorType(error: AppError): ErrorType {
  if (error instanceof ValidationError) return 'validation';
  if (error instanceof AuthError) return 'auth';
  if (error instanceof DatabaseError) return 'database';

  const code = error.code.toUpperCase();
  if (code.includes('VALID')) return 'validation';
  if (code.includes('AUTH') || code.includes('TOKEN') || code.includes('PERMISSION')) return 'auth';
  if (code.includes('DATABASE') || code.includes('DB')) return 'database';

  return 'unknown';
}

export function createErrorResponse(
  message: string,
  code: string,
  statusCode: number = 400,
  details?: unknown
): NextResponse<ApiErrorResponse> {
  return NextResponse.json(
    {
      success: false,
      message,
      error: {
        code,
        message,
        details
      }
    },
    { status: statusCode }
  );
}
