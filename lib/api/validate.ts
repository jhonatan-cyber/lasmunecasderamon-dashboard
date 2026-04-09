/**
 * Helper para validar requests con Zod
 *
 * Proporciona una forma einfach de validar el body/query de una request
 * y devolver errores de forma consistente.
 */

import { z } from 'zod';
import { NextResponse } from 'next/server';
import { createErrorResponse } from './middleware/errorHandler';

export interface ValidationResult<T> {
  success: true;
  data: T;
}

export interface ValidationError {
  success: false;
  errors: z.ZodIssue[];
}

export type ValidateResult<T> = ValidationResult<T> | ValidationError;

/**
 * Valida un schema Zod y devuelve el resultado
 *
 * @param schema - Schema Zod a usar para validación
 * @param data - Datos a validar
 * @returns Resultado de validación
 */
export function validateSchema<T extends z.ZodType>(
  schema: T,
  data: unknown
): ValidateResult<z.infer<T>> {
  const result = schema.safeParse(data);

  if (result.success) {
    return {
      success: true,
      data: result.data
    };
  }

  return {
    success: false,
    errors: result.error.issues
  };
}

/**
 * Middleware para validar el body de una request con Zod
 *
 * @param schema - Schema Zod para validar
 * @returns Response con errores si falla, o null si pasa
 */
export function validateRequestBody<T extends z.ZodType>(
  schema: T,
  body: unknown
): NextResponse | null {
  const result = validateSchema(schema, body);

  if (result.success) {
    return null; // Pasa la validación
  }

  // result is ValidationError here
  const errorData = result as ValidationError;
  return createErrorResponse('Error de validación', 'VALIDATION_ERROR', 400, errorData.errors);
}

/**
 * Valida query params con Zod
 *
 * @param schema - Schema Zod para validar
 * @param params - Objeto con los query params
 * @returns Resultado de validación
 */
export function validateQueryParams<T extends z.ZodType>(
  schema: T,
  params: Record<string, string | string[] | undefined>
): ValidateResult<z.infer<T>> {
  // Convertir params a objeto plano para validación
  const flatParams: Record<string, string> = {};

  for (const [key, value] of Object.entries(params)) {
    if (Array.isArray(value)) {
      flatParams[key] = value[0] || '';
    } else if (value !== undefined) {
      flatParams[key] = value;
    }
  }

  return validateSchema(schema, flatParams);
}

// Schema común para IDs
export const idSchema = z.object({
  id: z.coerce.number().int().positive('ID debe ser un número positivo')
});

// Schema para paginación
export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).optional()
});

// Schema para fecha
export const dateRangeSchema = z.object({
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional()
});
