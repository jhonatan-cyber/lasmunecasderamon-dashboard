import { NextResponse } from 'next/server';
import { withAppApiWrapper } from '@/lib/api/app-api-wrapper';
import { ProductRepository } from '@/lib/repositories/ProductRepository';
import { ProductService } from '@/lib/services/ProductService';
import path from 'path';
import fs from 'fs/promises';

const PRODUCT_UPLOAD_DIR = path.join(process.cwd(), 'public', 'img', 'products');

export const GET = withAppApiWrapper(async (request: Request) => {
  const { searchParams } = new URL(request.url);
  const categoryId = searchParams.get('categoryId') || undefined;
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
  const body = await request.json();
  const data = await ProductService.createProduct(body);

  return NextResponse.json(
    { success: true, message: 'Producto creado correctamente', data },
    { status: 201 }
  );
});

export const PUT = withAppApiWrapper(async (request: Request) => {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  let targetId = id;
  let fields: any = {};
  let fotoName: string | undefined;

  const contentType = request.headers.get('content-type') || '';

  if (contentType.includes('multipart/form-data')) {
    const formData = await request.formData();
    targetId = targetId || (formData.get('id') as string);

    formData.forEach((value, key) => {
      if (key !== 'foto' && key !== 'id') fields[key] = value;
    });

    const fotoFile = formData.get('foto') as File | null;
    fotoName = fields.foto || 'default.png';

    if (fotoFile && fotoFile.name) {
      const ext = path.extname(fotoFile.name);
      fotoName = `product_${Date.now()}${ext}`;
      const bytes = await fotoFile.arrayBuffer();
      const buffer = Buffer.from(bytes);
      await fs.mkdir(PRODUCT_UPLOAD_DIR, { recursive: true });
      await fs.writeFile(path.join(PRODUCT_UPLOAD_DIR, fotoName), buffer);
    }
  } else {
    const body = await request.json();
    targetId = targetId || body.id;
    fields = { ...body };
    delete fields.id;
    fotoName = fields.foto;
  }

  if (!targetId)
    return NextResponse.json({ success: false, message: 'ID es requerido' }, { status: 400 });

  const data = await ProductRepository.update(targetId, fields, fotoName || 'default.png');
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
