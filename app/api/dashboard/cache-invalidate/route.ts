import { NextResponse } from 'next/server';
import { DashboardCache } from '@/lib/cache/dashboardCache';
import { withRoute } from '@/lib/api/withRoute';

export const POST = withRoute(
  { auth: true, access: 'administrator', audit: true },
  async (request: Request) => {
    const body = (await request.json()) as { prefix?: string; keys?: string[]; all?: boolean };
    const { prefix, keys, all } = body;

    if (all) {
      DashboardCache.clear();
      return NextResponse.json({
        success: true,
        message: 'Todo el caché del dashboard ha sido limpiado'
      });
    }

    if (prefix) {
      DashboardCache.invalidateByPrefix(prefix);
      return NextResponse.json({
        success: true,
        message: `Caché invalidado para prefijo: ${prefix}`
      });
    }

    if (keys && keys.length > 0) {
      DashboardCache.invalidateMany(keys);
      return NextResponse.json({
        success: true,
        message: `Caché invalidado para ${keys.length} key(s)`
      });
    }

    return NextResponse.json(
      { success: false, message: 'Debe enviar prefix, keys o all=true' },
      { status: 400 }
    );
  }
);
