import { NextResponse } from 'next/server';
import { withPublicRoute, withRoute } from '@/lib/api/withRoute';
import { ProductService } from '@/lib/services/ProductService';
import { processAndSaveImage } from '@/lib/utils/image-utils';

export const GET = withPublicRoute(async (request: Request) => {
  const { searchParams } = new URL(request.url);
  const productoId = searchParams.get('producto_id');
  const productoIds = searchParams.get('producto_ids');

  if (productoIds) {
    const ids = productoIds
      .split(',')
      .map(s => s.trim())
      .filter(Boolean);
    const data = await ProductService.listPresentationsMap(ids);
    return NextResponse.json({ success: true, data });
  }

  if (!productoId) {
    return NextResponse.json(
      { success: false, message: 'producto_id es requerido' },
      { status: 400 }
    );
  }

  const data = await ProductService.listPresentations(productoId);
  return NextResponse.json({ success: true, data });
});

export const POST = withRoute(
  { auth: true, audit: true, module: 'products', action: 'write' },
  async (request: Request) => {
    const payload = await request.json();
    const productoId = payload.producto_id as string | undefined;

    if (!productoId) {
      return NextResponse.json(
        { success: false, message: 'producto_id es requerido' },
        { status: 400 }
      );
    }

    const data = await ProductService.addPresentation(productoId, {
      nombre: payload.nombre,
      codigo_barras: payload.codigo_barras,
      precio_compra: payload.precio_compra,
      foto:
        typeof payload.foto === 'string' && payload.foto.startsWith('http')
          ? await processAndSaveImage(payload.foto, 'presentacion')
          : payload.foto
    });
    return NextResponse.json(
      { success: true, message: 'Presentación agregada correctamente', data },
      { status: 201 }
    );
  }
);

export const PATCH = withRoute(
  { auth: true, audit: true, module: 'products', action: 'write' },
  async (request: Request) => {
    const contentType = request.headers.get('content-type') || '';
    let id: string | null = null;
    let fotoName: string | null = null;
    let fields: Record<string, unknown> = {};

    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData();
      id = (formData.get('id') as string) || new URL(request.url).searchParams.get('id');
      const fotoFile = formData.get('foto') as File | null;
      const fotoUrl = formData.get('fotoUrl') as string | null;
      if (fotoFile && fotoFile.name && fotoFile.size > 0) {
        const bytes = await fotoFile.arrayBuffer();
        fotoName = await processAndSaveImage(Buffer.from(bytes), 'presentacion');
      } else if (fotoUrl && (fotoUrl.startsWith('http') || fotoUrl.startsWith('data:'))) {
        fotoName = await processAndSaveImage(fotoUrl, 'presentacion');
      }
      for (const key of [
        'nombre',
        'codigo_barras',
        'precio_compra',
        'precio_venta',
        'comision',
        'ml_botella'
      ]) {
        const value = formData.get(key);
        if (value !== null && String(value) !== '') fields[key] = value;
      }
    } else {
      const payload = await request.json();
      id = payload.id || new URL(request.url).searchParams.get('id');
      if (typeof payload.foto === 'string' && payload.foto) {
        fotoName = payload.foto.startsWith('http')
          ? await processAndSaveImage(payload.foto, 'presentacion')
          : payload.foto;
      }
      for (const key of [
        'nombre',
        'codigo_barras',
        'precio_compra',
        'precio_venta',
        'comision',
        'ml_botella'
      ]) {
        // Se pasa '' para limpiar el código de barras o los ml de la botella.
        if (payload[key] !== undefined) fields[key] = payload[key];
      }
    }

    if (!id || (!fotoName && Object.keys(fields).length === 0)) {
      return NextResponse.json(
        {
          success: false,
          message: 'ID y al menos un campo (foto, nombre, código o precio) son requeridos'
        },
        { status: 400 }
      );
    }

    if (Object.keys(fields).length > 0) {
      await ProductService.updatePresentation(id, fields);
    }
    if (fotoName) {
      await ProductService.updatePresentationFoto(id, fotoName);
    }
    return NextResponse.json({
      success: true,
      message: 'Presentación actualizada correctamente',
      data: { id, ...(fotoName ? { foto: fotoName } : {}) }
    });
  }
);

export const DELETE = withRoute(
  { auth: true, audit: true, module: 'products', action: 'delete' },
  async (request: Request) => {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ success: false, message: 'ID es requerido' }, { status: 400 });
    }

    await ProductService.removePresentation(id);
    return NextResponse.json({ success: true, message: 'Presentación eliminada correctamente' });
  }
);
