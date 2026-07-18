export class AppError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly statusCode: number = 500,
    public readonly details?: unknown
  ) {
    super(message);
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }
}

export class ValidationError extends AppError {
  constructor(message: string, details?: unknown) {
    super(message, 'VALIDATION_ERROR', 400, details);
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string, id?: string | number) {
    const msg = id ? `${resource} con ID ${id} no encontrado` : `${resource} no encontrado`;
    super(msg, 'NOT_FOUND', 404);
  }
}

export class ConflictError extends AppError {
  constructor(message: string, details?: unknown) {
    super(message, 'CONFLICT', 409, details);
  }
}

export class BusinessError extends AppError {
  constructor(message: string, code: string = 'BUSINESS_ERROR', details?: unknown) {
    super(message, code, 422, details);
  }
}

export class DatabaseError extends AppError {
  constructor(message: string, originalError?: unknown) {
    super(`Error en la base de datos: ${message}`, 'DATABASE_ERROR', 500, originalError);
  }
}

export const formatErrorResponse = (error: unknown) => {
  if (error instanceof AppError) {
    return {
      success: false,
      message: error.message,
      error: {
        code: error.code,
        message: error.message,
        details: error.details
      }
    };
  }

  if (error instanceof Error) {
    return {
      success: false,
      message: error.message,
      error: {
        code: 'UNKNOWN_ERROR',
        message: error.message
      }
    };
  }

  return {
    success: false,
    message: 'Error desconocido',
    error: {
      code: 'UNKNOWN_ERROR',
      message: 'Error desconocido'
    }
  };
};
