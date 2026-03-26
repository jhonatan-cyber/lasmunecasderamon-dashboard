import { NextResponse } from 'next/server';
import { AppError, formatErrorResponse } from '../errors/errors';

/**
 * Helper para estandarizar las respuestas de la API en el backend (App Router).
 * Proporciona métodos consistentes para éxito y manejo de errores.
 */
export class ApiResponse {
  /**
   * Respuesta exitosa (200 OK por defecto)
   */
  static success<T>(data: T, message?: string, statusCode: number = 200) {
    return NextResponse.json(
      {
        success: true,
        data,
        message,
      },
      { status: statusCode }
    );
  }

  /**
   * Respuesta de creación exitosa (201 Created)
   */
  static created<T>(data: T, message: string = 'Recurso creado correctamente') {
    return this.success(data, message, 201);
  }

  /**
   * Respuesta de error estandarizada
   */
  static error(error: unknown) {
    const formatted = formatErrorResponse(error);
    const statusCode = error instanceof AppError ? error.statusCode : 500;

    return NextResponse.json(formatted, { status: statusCode });
  }

  /**
   * Error de validación (400 Bad Request)
   */
  static validationError(message: string, details?: any) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message,
          details,
        },
      },
      { status: 400 }
    );
  }

  /**
   * Error de no encontrado (404 Not Found)
   */
  static notFound(message: string = 'Recurso no encontrado') {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'NOT_FOUND',
          message,
        },
      },
      { status: 404 }
    );
  }

  /**
   * Error de autorización (401 Unauthorized)
   */
  static unauthorized(message: string = 'No autorizado') {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message,
        },
      },
      { status: 401 }
    );
  }
}
