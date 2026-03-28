import { NextResponse } from 'next/server';
import { withAppApiWrapper, withAppAuth } from '@/lib/api/app-api-wrapper';
import { ProductRepository } from '@/lib/repositories/ProductRepository';

export const PUT = withAppAuth(
  async (request: Request) => {
    const body = await request.json();
    
    // El hook envía { category_id, product_orders }
    const product_orders = Array.isArray(body) ? body : body.product_orders;

    if (!Array.isArray(product_orders)) {
      return NextResponse.json(
        { success: false, message: 'Se esperaba un array de productos (product_orders)' },
        { status: 400 }
      );
    }

    await ProductRepository.reorder(product_orders);
    
    return NextResponse.json({ 
      success: true, 
      message: 'Orden de productos actualizado correctamente' 
    });
  },
  { module: 'products', action: 'edit' }
);
