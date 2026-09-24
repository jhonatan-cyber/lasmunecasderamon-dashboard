import { NextResponse } from 'next/server';
import { withPublicRoute, withRoute } from '@/lib/api/withRoute';
import { ClientService } from '@/lib/services/ClientService';
import { jsonWithNormalizedDates } from '@/lib/api/date-response';
import { ValidationError } from '@/lib/errors/errors';

export const GET = withPublicRoute(
  async (request: Request, { params }: { params: Promise<{ id: string }> }) => {
    const id = (await params).id;
    const client = await ClientService.getById(id);
    if (!client)
      return NextResponse.json(
        { success: false, message: 'Cliente no encontrado' },
        { status: 404 }
      );
    return jsonWithNormalizedDates({ success: true, data: client });
  }
);

export const PUT = withRoute(
  { auth: true, audit: true, module: 'clients', action: 'write' },
  async (request: Request, { params }: { params: Promise<{ id: string }> }) => {
    const id = (await params).id;
    const body = await request.json();
    const { run, name, lastName, phone } = body;

    if (!name || !lastName)
      throw new ValidationError('name y lastName son requeridos', { name, lastName });

    await ClientService.updateClient(id, { run, name, lastName, phone });
    return NextResponse.json({ success: true, message: 'Cliente actualizado correctamente' });
  }
);

export const DELETE = withRoute(
  { auth: true, audit: true, module: 'clients', action: 'delete' },
  async (request: Request, { params }: { params: Promise<{ id: string }> }) => {
    const id = (await params).id;
    await ClientService.delete(id);
    return NextResponse.json({ success: true, message: 'Cliente eliminado correctamente' });
  }
);
