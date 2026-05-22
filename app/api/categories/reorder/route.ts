import { NextResponse } from 'next/server';
import { withAppAuth } from '@/lib/api/app-api-wrapper';
import { CategoryRepository } from '@/lib/repositories/CategoryRepository';
import { ValidationError } from '@/lib/errors/errors';

export const PUT = withAppAuth(async (request: Request) => {
  const body = await request.json();
  const category_orders = Array.isArray(body) ? body : body.category_orders;

  if (!Array.isArray(category_orders)) {
    throw new ValidationError('Se esperaba un array de categorÃ­as (category_orders)');
  }

  await CategoryRepository.reorder(category_orders);

  return NextResponse.json({
    success: true,
    message: 'Orden actualizado correctamente'
  });
});
