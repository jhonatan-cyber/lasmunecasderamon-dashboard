import { NextResponse } from 'next/server';
import { z } from 'zod';
import { withRoute } from '@/lib/api/withRoute';
import { cambiarAnfitrionasServicio } from '@/modules/operacion';
const schema = z.object({ usuarios: z.array(z.string().min(1)).max(100) });
export const PATCH = withRoute(
  { auth: true, module: 'private_rooms', action: 'write', audit: true },
  async (request, { params }) => {
    const { id } = await params;
    const { usuarios } = schema.parse(await request.json());
    await cambiarAnfitrionasServicio(id, usuarios);
    return NextResponse.json({ success: true });
  }
);
