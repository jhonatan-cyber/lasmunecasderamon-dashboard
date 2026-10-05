import { NextResponse } from 'next/server';
import { withRoute } from '@/lib/api/withRoute';
import { listarSolicitudes } from '@/modules/clientes';

export const GET = withRoute(
  { auth: true, audit: false, module: 'clients', action: 'read' },
  async () => {
    try {
      return NextResponse.json({ success: true, data: await listarSolicitudes() });
    } catch (error: any) {
      // Si tabla no existe aun, devolver vacio
      if (
        String(error?.message || '').includes('does not exist') ||
        String(error?.code) === '42P01'
      ) {
        return NextResponse.json({ success: true, data: [] });
      }
      throw error;
    }
  }
);
