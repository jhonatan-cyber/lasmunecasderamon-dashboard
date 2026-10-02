import { NextResponse } from 'next/server';
import { AppError, formatErrorResponse } from '../errors/errors';

export class ApiResponse {
  static success<T>(data: T, message?: string, statusCode: number = 200) {
    return NextResponse.json(
      {
        success: true,
        data,
        message
      },
      { status: statusCode }
    );
  }

  static created<T>(data: T, message: string = 'Recurso creado correctamente') {
    return this.success(data, message, 201);
  }

  static error(error: unknown) {
    const formatted = formatErrorResponse(error);
    const statusCode = error instanceof AppError ? error.statusCode : 500;

    // `code` en el tope: los diálogos deciden su UI (p. ej. CONFLICT → aviso
    // inline con acción) sin analizar el objeto anidado `error`.
    const code = error instanceof AppError ? error.code : undefined;

    return NextResponse.json(code ? { ...formatted, code } : formatted, { status: statusCode });
  }

  static validationError(message: string, details?: any) {
    return NextResponse.json(
      {
        success: false,
        message,
        error: {
          code: 'VALIDATION_ERROR',
          message,
          details
        }
      },
      { status: 400 }
    );
  }

  static notFound(message: string = 'Recurso no encontrado') {
    return NextResponse.json(
      {
        success: false,
        message,
        error: {
          code: 'NOT_FOUND',
          message
        }
      },
      { status: 404 }
    );
  }

  static unauthorized(message: string = 'No autorizado') {
    return NextResponse.json(
      {
        success: false,
        message,
        error: {
          code: 'UNAUTHORIZED',
          message
        }
      },
      { status: 401 }
    );
  }

  static forbidden(message: string = 'Permisos insuficientes') {
    return NextResponse.json(
      {
        success: false,
        message,
        error: {
          code: 'FORBIDDEN',
          message
        }
      },
      { status: 403 }
    );
  }
}
