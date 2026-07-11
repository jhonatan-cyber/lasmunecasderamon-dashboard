import { NextResponse } from 'next/server';
import { ClientService } from '@/lib/services/ClientService';
import { withAppApiWrapper, withAppAuth } from '@/lib/api/app-api-wrapper';

export const GET = withAppApiWrapper(async (request: Request) => {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (id) {
    const client = await ClientService.getById(id);
    if (!client)
      return NextResponse.json(
        { success: false, message: 'Cliente no encontrado' },
        { status: 404 }
      );
    return NextResponse.json({ success: true, data: client });
  }

  const search = searchParams.get('search') || undefined;
  const limit = Math.min(Number(searchParams.get('limit') ?? 50), 200);
  const offset = Number(searchParams.get('offset') ?? 0);

  const { data, total } = await ClientService.getAll({ search, limit, offset });
  return NextResponse.json({ success: true, data, total, limit, offset });
});

export const POST = withAppAuth(
  async request => {
    const body = await request.json();
    const data = await ClientService.createClient(body);
    return NextResponse.json(
      { success: true, message: 'Cliente creado correctamente', data },
      { status: 201 }
    );
  },
  { module: 'clients', action: 'write' }
);

export const PUT = withAppAuth(
  async request => {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const body = await request.json();

    const targetId = id || body.id;
    if (!targetId)
      return NextResponse.json({ success: false, message: 'El ID es requerido' }, { status: 400 });

    const data = await ClientService.updateClient(targetId, body);
    return NextResponse.json({ success: true, message: 'Cliente actualizado correctamente', data });
  },
  { module: 'clients', action: 'write' }
);

export const DELETE = withAppAuth(
  async request => {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id)
      return NextResponse.json({ success: false, message: 'El ID es requerido' }, { status: 400 });

    await ClientService.delete(id);
    return NextResponse.json({ success: true, message: 'Cliente eliminado correctamente' });
  },
  { module: 'clients', action: 'delete' }
);
