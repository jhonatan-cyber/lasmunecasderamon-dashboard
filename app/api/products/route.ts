import { NextResponse } from 'next/server';
import { withAppApiWrapper } from '@/lib/api/app-api-wrapper';
import { ProductRepository } from '@/lib/repositories/ProductRepository';
import { ProductService } from '@/lib/services/ProductService';
import { processAndSaveImage } from '@/lib/utils/image-utils';
import { logger } from '@/lib/utils/logger';

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

  logger.debug('[POST /api/products] Content-Type:', contentType);

  if (contentType.includes('multipart/form-data')) {
    const formData = await request.formData();
    formData.forEach((value, key) => {
      if (key !== 'foto' && key !== 'fotoUrl') payload[key] = value;
    });

    logger.debug('[POST /api/products] FormData payload:', { payload });

    const fotoFile = formData.get('foto') as File | null;
    const fotoUrl = formData.get('fotoUrl') as string | null;

    logger.debug('[POST /api/products] fotoFile:', fotoFile ? { name: fotoFile.name, size: fotoFile.size } : null);
    logger.debug('[POST /api/products] fotoUrl:', fotoUrl);

    if (fotoFile && fotoFile.name && fotoFile.size > 0) {
      const bytes = await fotoFile.arrayBuffer();
      const buffer = Buffer.from(bytes);
      logger.debug('[POST /api/products] Processing uploaded file, size:', buffer.length);
      fotoName = await processAndSaveImage(buffer, 'product');
    } else if (fotoUrl && fotoUrl.startsWith('http')) {
      logger.debug('[POST /api/products] Processing URL image');
      fotoName = await processAndSaveImage(fotoUrl, 'product');
    }
  } else {
    payload = await request.json();
    logger.debug('[POST /api/products] JSON payload:', { payload });
    fotoName = payload.foto || 'default.png';
    if (fotoName.startsWith('http')) {
      fotoName = await processAndSaveImage(fotoName, 'product');
    }
  }

  logger.debug('[POST /api/products] Final fotoName:', fotoName);

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

  logger.debug('[PUT /api/products] Content-Type:', contentType);

  if (contentType.includes('multipart/form-data')) {
    const formData = await request.formData();
    targetId = targetId || (formData.get('id') as string);

    formData.forEach((value, key) => {
      if (key !== 'foto' && key !== 'fotoUrl' && key !== 'id') payload[key] = value;
    });

    const fotoFile = formData.get('foto') as File | null;
    const fotoUrl = formData.get('fotoUrl') as string | null;

    logger.debug('[PUT /api/products] fotoFile:', fotoFile ? { name: fotoFile.name, size: fotoFile.size } : null);
    logger.debug('[PUT /api/products] fotoUrl:', fotoUrl);

    if (fotoFile && fotoFile.name && fotoFile.size > 0) {
      const bytes = await fotoFile.arrayBuffer();
      const buffer = Buffer.from(bytes);
      logger.debug('[PUT /api/products] Processing uploaded file, size:', buffer.length);
      fotoName = await processAndSaveImage(buffer, `product_${targetId}`);
    } else if (fotoUrl && (fotoUrl.startsWith('http') || fotoUrl.startsWith('data:'))) {
      logger.debug('[PUT /api/products] Processing URL/image data, type:', fotoUrl.startsWith('data:') ? 'base64' : 'http');
      fotoName = await processAndSaveImage(fotoUrl, `product_${targetId}`);
    }
    // Si no hay nueva imagen, fotoName queda undefined y el servicio usará la imagen existente
  } else {
    payload = await request.json();
    logger.debug('[PUT /api/products] JSON payload:', { payload });
    targetId = targetId || payload.id;
    delete payload.id;
    fotoName = payload.foto;
    
    if (fotoName && fotoName.startsWith('http')) {
      logger.debug('[PUT /api/products] Processing URL for existing product');
      fotoName = await processAndSaveImage(fotoName, `product_${targetId}`);
    }
  }

  if (!targetId)
    return NextResponse.json({ success: false, message: 'ID es requerido' }, { status: 400 });

  logger.debug('[PUT /api/products] Final fotoName:', fotoName);

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
