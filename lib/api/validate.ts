

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


export function validateRequestBody<T extends z.ZodType>(
  schema: T,
  body: unknown
): NextResponse | null {
  const result = validateSchema(schema, body);

  if (result.success) {
    return null; 
  }

  
  const errorData = result as ValidationError;
  return createErrorResponse('Error de validación', 'VALIDATION_ERROR', 400, errorData.errors);
}


export function validateQueryParams<T extends z.ZodType>(
  schema: T,
  params: Record<string, string | string[] | undefined>
): ValidateResult<z.infer<T>> {
  
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


export const idSchema = z.object({
  id: z.coerce.number().int().positive('ID debe ser un número positivo')
});


export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).optional()
});


export const dateRangeSchema = z.object({
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional()
});
