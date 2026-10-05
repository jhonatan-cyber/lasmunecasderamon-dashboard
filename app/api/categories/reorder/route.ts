import { NextResponse } from 'next/server';
import { withRoute } from '@/lib/api/withRoute';
import { CategoryService } from '@/modules/inventario';
import { ValidationError } from '@/lib/errors/errors';

// Reordenar es una edición de categorías: mismo guard que el resto del módulo.
export const PUT = withRoute(
  { auth: true, audit: true, module: 'categories', action: 'write' },
  async (request: Request) => {
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
  }
);
