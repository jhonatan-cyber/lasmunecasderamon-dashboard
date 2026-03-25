import { NextResponse } from 'next/server';
import { ProductRepository } from '@/lib/repositories/ProductRepository';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const categoryId = searchParams.get('categoryId') || undefined;
    const term = searchParams.get('term');
    
    if (term) {
      const data = await ProductRepository.search(term);
      return NextResponse.json({ success: true, data });
    }
    
    const data = await ProductRepository.getAll(categoryId);
    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: 'Error getting products', error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { id, ...data } = body;
    await ProductRepository.create(id, data, body.foto || 'default.png');
    return NextResponse.json({ success: true, message: 'Product created' }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message || 'Error creating product' }, { status: 400 });
  }
}
