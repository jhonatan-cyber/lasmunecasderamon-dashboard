import { NextResponse } from 'next/server';
import { ClientRepository } from '@/lib/repositories/ClientRepository';
import { ClientService } from '@/lib/services/ClientService';
import { withAppApiWrapper, withAppAuth } from '@/lib/api/app-api-wrapper';

export const GET = withAppApiWrapper(async () => {
  const data = await ClientRepository.getAll();
  return NextResponse.json({ success: true, data });
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

    if (!id) {
      return NextResponse.json({ success: false, message: 'El ID es requerido' }, { status: 400 });
    }

    await ClientRepository.delete(id);
    return NextResponse.json({ success: true, message: 'Cliente eliminado correctamente' });
  },
  { module: 'clients', action: 'delete' }
);
