import { NextResponse } from 'next/server';
import { withRoute } from '@/lib/api/withRoute';
import { listarAnticiposDeUsuario } from '@/modules/personal';

export const GET = withRoute(
  { auth: true, access: 'authenticated', audit: true },
  async (_request: Request, { user }: { params: any; user: any }) => {
    const data = await listarAnticiposDeUsuario(user.id.toString());
    return NextResponse.json({ success: true, data });
  }
);
