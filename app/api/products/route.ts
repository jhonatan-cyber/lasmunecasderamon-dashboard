import { NextResponse } from 'next/server';
import { withAppApiWrapper } from '@/lib/api/app-api-wrapper';
import { ProductRepository } from '@/lib/repositories/ProductRepository';
import { ProductService } from '@/lib/services/ProductService';
import { processAndSaveImage } from '@/lib/utils/image-utils';

export const GET = withAppApiWrapper(async (request: Request) => {
  const { searchParams } = new URL(request.url);
  const categoryId = searchParams.get('category_id') || searchParams.get('categoryId') || undefined;
  const term = searchParams.get('term');
  const id = searchParams.get('id');

  if (id) {
    const data = await ProductRepository.getById(id);
    if (!data)
      return NextResponse.json(
        { success: false, message: 'Producto no encontrado' },
        { status: 404 }
      );
    return NextResponse.json({ success: true, data });
  }

  if (term) {
    const data = await ProductRepository.search(term);
    return NextResponse.json({ success: true, data });
  }

  const data = await ProductRepository.getAll(categoryId);
  return NextResponse.json({ success: true, data });
});

export const POST = withAppApiWrapper(async (request: Request) => {
  const contentType = request.headers.get('content-type') || '';
  let payload: any = {};
  let fotoName = 'default.png';

  if (contentType.includes('multipart/form-data')) {
    const formData = await request.formData();
    formData.forEach((value, key) => {
      if (key !== 'foto' && key !== 'fotoUrl') payload[key] = value;
    });

    const fotoFile = formData.get('foto') as File | null;
    const fotoUrl = formData.get('fotoUrl') as string | null;

    if (fotoFile && fotoFile.name && fotoFile.size > 0) {
      const bytes = await fotoFile.arrayBuffer();
      const buffer = Buffer.from(bytes);
      fotoName = await processAndSaveImage(buffer, 'product');
    } else if (fotoUrl && fotoUrl.startsWith('http')) {
      fotoName = await processAndSaveImage(fotoUrl, 'product');
    }
  } else {
    payload = await request.json();
    fotoName = payload.foto || 'default.png';
    if (fotoName.startsWith('http')) {
      fotoName = await processAndSaveImage(fotoName, 'product');
    }
  }

  // Usamos el servicio para aplicar lógica de negocio (duplicados, etc.)
  const data = await ProductService.createProduct(payload, fotoName);

  return NextResponse.json(
    { success: true, message: 'Producto creado correctamente', data },
    { status: 201 }
  );
});

export const PUT = withAppApiWrapper(async (request: Request) => {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  let targetId = id;
  let payload: any = {};
  let fotoName: string | undefined;

  const contentType = request.headers.get('content-type') || '';

  if (contentType.includes('multipart/form-data')) {
    const formData = await request.formData();
    targetId = targetId || (formData.get('id') as string);

    formData.forEach((value, key) => {
      if (key !== 'foto' && key !== 'fotoUrl' && key !== 'id') payload[key] = value;
    });

    const fotoFile = formData.get('foto') as File | null;
    const fotoUrl = formData.get('fotoUrl') as string | null;
    fotoName = payload.foto;

    if (fotoFile && fotoFile.name && fotoFile.size > 0) {
      const bytes = await fotoFile.arrayBuffer();
      const buffer = Buffer.from(bytes);
      fotoName = await processAndSaveImage(buffer, `product_${targetId}`);
    } else if (fotoUrl && fotoUrl.startsWith('http')) {
      fotoName = await processAndSaveImage(fotoUrl, `product_${targetId}`);
    }
  } else {
    payload = await request.json();
    targetId = targetId || payload.id;
    delete payload.id;
    fotoName = payload.foto;
    
    if (fotoName && fotoName.startsWith('http')) {
      fotoName = await processAndSaveImage(fotoName, `product_${targetId}`);
    }
  }

  if (!targetId)
    return NextResponse.json({ success: false, message: 'ID es requerido' }, { status: 400 });

  // Usamos el servicio para aplicar lógica de negocio
  const data = await ProductService.updateProduct(targetId, payload, fotoName);

  return NextResponse.json({ success: true, message: 'Producto actualizado correctamente', data });
});

export const DELETE = withAppApiWrapper(async (request: Request) => {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id)
    return NextResponse.json({ success: false, message: 'ID es requerido' }, { status: 400 });

  await ProductRepository.delete(id);
  return NextResponse.json({ success: true, message: 'Producto eliminado correctamente' });
});
