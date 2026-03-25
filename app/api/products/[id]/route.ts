import { NextResponse } from 'next/server';
import { ProductRepository } from '@/lib/repositories/ProductRepository';
import path from 'path';
import fs from 'fs/promises';

const PRODUCT_UPLOAD_DIR = path.join(process.cwd(), 'public', 'img', 'products');

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
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
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 400 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const id = (await params).id;
    await ProductRepository.delete(id);
    return NextResponse.json({ success: true, message: 'Producto eliminado' });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
