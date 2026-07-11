import { NextResponse } from 'next/server';
import { withAppApiWrapper, withAppAuth } from '@/lib/api/app-api-wrapper';
import { ProductService } from '@/lib/services/ProductService';

export const PUT = withAppAuth(
  async (request: Request) => {
    const body = await request.json();

    const product_orders = Array.isArray(body) ? body : body.product_orders;

    if (!Array.isArray(product_orders)) {
      return NextResponse.json(
        { success: false, message: 'Se esperaba un array de productos (product_orders)' },
        { status: 400 }
      );
    }

    await ProductService.reorder(product_orders);

    return NextResponse.json({
      success: true,
      message: 'Orden de productos actualizado correctamente'
    });
  },
  { module: 'products', action: 'edit' }
);
