
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

export class AuthError extends AppError {
  constructor(message: string = 'No autorizado', code: string = 'UNAUTHORIZED', statusCode: number = 401) {
    super(message, code, statusCode);
  }
}

export class DatabaseError extends AppError {
  constructor(message: string, originalError?: unknown) {
    super(`Error en la base de datos: ${message}`, 'DATABASE_ERROR', 500, originalError);
  }
}

export class CommissionError extends AppError {
  constructor(
    message: string,
    code: string,
    statusCode: number = 500,
    details?: unknown
  ) {
    super(message, code, statusCode, details);
  }
}

export class CommissionNotFoundError extends CommissionError {
  constructor(id: string | number) {
    super(
      `La comisión con ID ${id} no fue encontrada`,
      'COMMISSION_NOT_FOUND',
      404
    );
  }
}

export class CommissionInactiveError extends CommissionError {
  constructor(id: string | number) {
    super(
      `La comisión con ID ${id} está inactiva o eliminada`,
      'COMMISSION_INACTIVE',
      400
    );
  }
}

export class InvalidCommissionStatusError extends CommissionError {
  constructor(currentStatus: string, newStatus: string) {
    super(
      `No se puede cambiar el estado de la comisión de "${currentStatus}" a "${newStatus}"`,
      'INVALID_STATUS_TRANSITION',
      400
    );
  }
}

export class EmployeeNotFoundError extends CommissionError {
  constructor(id: string | number) {
    super(
      `La anfitriona con ID ${id} no fue encontrada`,
      'EMPLOYEE_NOT_FOUND',
      404
    );
  }
}

export class EmployeeInactiveError extends CommissionError {
  constructor(id: string | number) {
    super(
      `La anfitriona con ID ${id} está inactiva`,
      'EMPLOYEE_INACTIVE',
      400
    );
  }
}

export class InvalidCommissionAmountError extends CommissionError {
  constructor(amount: number) {
    super(
      `El monto de la comisión (${amount}) es inválido`,
      'INVALID_AMOUNT',
      400
    );
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
        details: error.details,
      },
    };
  }

  if (error instanceof Error) {
    return {
      success: false,
      message: error.message,
      error: {
        code: 'UNKNOWN_ERROR',
        message: error.message,
      },
    };
  }

  return {
    success: false,
    message: 'Error desconocido',
    error: {
      code: 'UNKNOWN_ERROR',
      message: 'Error desconocido',
    },
  };
};

export const validateStatusTransition = (currentStatus: string, newStatus: string): boolean => {
  const transitions: Record<string, string[]> = {
    'por_pagar': ['pagado', 'anulado'],
    'pagado': [],
    'anulado': [],
  };

  return transitions[currentStatus]?.includes(newStatus) || false;
};
