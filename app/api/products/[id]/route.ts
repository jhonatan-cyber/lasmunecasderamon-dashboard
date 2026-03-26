import { NextResponse } from 'next/server';
import { withAppApiWrapper } from '@/lib/api/app-api-wrapper';
import { ProductRepository } from '@/lib/repositories/ProductRepository';
import path from 'path';
import fs from 'fs/promises';

const PRODUCT_UPLOAD_DIR = path.join(process.cwd(), 'public', 'img', 'products');

export const PUT = withAppApiWrapper(
  async (request: Request, { params }: { params: Promise<{ id: string }> }) => {
    const id = (await params).id;
    const formData = await request.formData();

    const fields: any = {};
    formData.forEach((value, key) => {
      if (key !== 'foto') fields[key] = value;
    });

    const fotoFile = formData.get('foto') as File | null;
    let fotoName = fields.foto || 'default.png';

    if (fotoFile && fotoFile.name) {
      const ext = path.extname(fotoFile.name);
      fotoName = `product_${Date.now()}${ext}`;
      const bytes = await fotoFile.arrayBuffer();
      const buffer = Buffer.from(bytes);
      await fs.writeFile(path.join(PRODUCT_UPLOAD_DIR, fotoName), buffer);
    }

    await ProductRepository.update(id, fields, fotoName);
    return NextResponse.json({ success: true, message: 'Producto actualizado' });
  }
);

export const DELETE = withAppApiWrapper(
  async (request: Request, { params }: { params: Promise<{ id: string }> }) => {
    const id = (await params).id;
    await ProductRepository.delete(id);
    return NextResponse.json({ success: true, message: 'Producto eliminado' });
  }
);
