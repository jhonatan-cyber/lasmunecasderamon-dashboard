import { NextResponse } from 'next/server';
import { withRoute } from '@/lib/api/withRoute';
import { CategoryService } from '@/lib/services/CategoryService';
import { ValidationError } from '@/lib/errors/errors';

export const PUT = withRoute({ auth: true, audit: true, module: 'products', action: 'write' }, async (request: Request) => {
  const body = await request.json();
  const category_orders = Array.isArray(body) ? body : body.category_orders;

  if (!Array.isArray(category_orders)) {
    throw new ValidationError('Se esperaba un array de categorías (category_orders)');
  }

  await CategoryService.reorder(category_orders);

  return NextResponse.json({
    success: true,
    message: 'Orden actualizado correctamente'
  });
});
