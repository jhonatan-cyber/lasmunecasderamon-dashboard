import { z } from 'zod';
import { NextResponse } from 'next/server';

export function validate<T>(schema: z.ZodType<T>, data: unknown): T {
  return schema.parse(data);
}

export function validateOrResponse<T>(
  schema: z.ZodType<T>,
  data: unknown
): T | NextResponse {
  const result = schema.safeParse(data);
  if (!result.success) {
    const issues = result.error.issues;
    return NextResponse.json(
      {
        success: false,
        message: 'Error de validación',
        error: {
          code: 'VALIDATION_ERROR',
          message: issues.map(i => i.message).join(', '),
          details: issues
        }
      },
      { status: 400 }
    );
  }
  return result.data;
}
