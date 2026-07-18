import { NextResponse } from 'next/server';
import { withRoute } from '@/lib/api/withRoute';
import { UserService } from '@/lib/services/UserService';
import { sendNotificationToAll } from '@/lib/api/sseService';

export const GET = withRoute(
  { auth: true, audit: true },
  async (request: Request, { params }: { params: Promise<{ id: string }> }) => {
    const id = (await params).id;
    const data = await UserService.getById(id);
    if (!data)
      return NextResponse.json(
        { success: false, message: 'Usuario no encontrado' },
        { status: 404 }
      );
    return NextResponse.json({ success: true, user: data });
  }
);

export const PUT = withRoute(
  { auth: true, audit: true },
  async (request: Request, { params }: { params: Promise<{ id: string }> }) => {
    const id = (await params).id;
    const body = await request.json();
    await UserService.update(id, body);
    sendNotificationToAll('profile_updated', { userId: id });
    return NextResponse.json({ success: true, message: 'Usuario actualizado' });
  }
);

export const DELETE = withRoute(
  { auth: true, audit: true },
  async (request: Request, { params }: { params: Promise<{ id: string }> }) => {
    const id = (await params).id;
    await UserService.delete(id);
    return NextResponse.json({ success: true, message: 'Usuario eliminado' });
  }
);
