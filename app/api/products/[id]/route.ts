import { NextResponse } from 'next/server';
import { withAppAuth } from '@/lib/api/app-api-wrapper';
import { ProductRepository } from '@/lib/repositories/ProductRepository';
import { ProductService } from '@/lib/services/ProductService';
import { processAndSaveImage } from '@/lib/utils/image-utils';

export const PUT = withAppAuth(
  async (request: Request, { params }: { params: Promise<{ id: string }>; user: any }) => {
    const id = (await params).id;
    const contentType = request.headers.get('content-type') || '';
    let payload: any = {};
    let fotoName: string | undefined;

    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData();
      formData.forEach((value, key) => {
        if (key !== 'foto' && key !== 'fotoUrl') payload[key] = value;
      });

      const fotoFile = formData.get('foto') as File | null;
      const fotoUrl = formData.get('fotoUrl') as string | null;
      fotoName = payload.foto;

      if (fotoFile && fotoFile.name && fotoFile.size > 0) {
        const bytes = await fotoFile.arrayBuffer();
        const buffer = Buffer.from(bytes);
        fotoName = await processAndSaveImage(buffer, `product_${id}`);
      } else if (fotoUrl && fotoUrl.startsWith('http')) {
        fotoName = await processAndSaveImage(fotoUrl, `product_${id}`);
      }
    } else {
      payload = await request.json();
      fotoName = payload.foto;
      if (fotoName && fotoName.startsWith('http')) {
        fotoName = await processAndSaveImage(fotoName, `product_${id}`);
      }
    }

    const data = await ProductService.updateProduct(id, payload, fotoName);
    return NextResponse.json({ success: true, message: 'Producto actualizado', data });
  }
);

export const DELETE = withAppAuth(
  async (request: Request, { params }: { params: Promise<{ id: string }>; user: any }) => {
    const id = (await params).id;
    await ProductRepository.delete(id);
    return NextResponse.json({ success: true, message: 'Producto eliminado' });
  }
);
