import { NextResponse } from 'next/server';
import { ClientService } from '@/workflows/clientes';
import { withPublicRoute, withRoute } from '@/lib/api/withRoute';
import { ClientSchema } from '@/lib/business/schemas/client';
import { validateOrResponse } from '@/lib/api/validate';

export const GET = withPublicRoute(async (request: Request) => {
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
  const conSaldo = searchParams.get('con_saldo') === '1';

  const { data, total } = await ClientService.getAll({ search, limit, offset, conSaldo });
  return NextResponse.json({ success: true, data, total, limit, offset });
});

export const POST = withRoute(
  { auth: true, audit: true, module: 'clients', action: 'write' },
  async request => {
    const body = await request.json();
    const validated = validateOrResponse(ClientSchema, body);
    if (validated instanceof NextResponse) return validated;
    const data = await ClientService.createClient(validated);
    return NextResponse.json(
      { success: true, message: 'Cliente creado correctamente', data },
      { status: 201 }
    );
  }
);

export const PUT = withRoute(
  { auth: true, audit: true, module: 'clients', action: 'write' },
  async request => {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const body = await request.json();

    const targetId = id || body.id;
    if (!targetId)
      return NextResponse.json({ success: false, message: 'El ID es requerido' }, { status: 400 });

    const validated = validateOrResponse(ClientSchema, body);
    if (validated instanceof NextResponse) return validated;
    const data = await ClientService.updateClient(targetId, validated);
    return NextResponse.json({ success: true, message: 'Cliente actualizado correctamente', data });
  }
);

export const DELETE = withRoute(
  { auth: true, audit: true, module: 'clients', action: 'delete' },
  async request => {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id)
      return NextResponse.json({ success: false, message: 'El ID es requerido' }, { status: 400 });

    await ClientService.delete(id);
    return NextResponse.json({ success: true, message: 'Cliente eliminado correctamente' });
  }
);
