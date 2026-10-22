import { NextResponse } from 'next/server';
import { withRoute } from '@/lib/api/withRoute';
import { ApiResponse } from '@/lib/api/api-response';
import { getOrCreateAttendanceCode } from '@/modules/identidad';
import { logger } from '@/lib/utils/logger';

export const dynamic = 'force-dynamic';

export const GET = withRoute(
  { auth: true, access: 'authenticated', audit: true },
  async (_request: Request, { user }: { params: any; user: any }) => {
    try {
      const role = String(user?.role || '').toLowerCase();
      const canReadAttendanceCode =
        role === 'administrador' ||
        role === 'administradora' ||
        role === 'cajero' ||
        role === 'cajera';

      if (!canReadAttendanceCode) {
        return ApiResponse.forbidden('Permisos insuficientes');
      }

      return NextResponse.json({ success: true, codigo: await getOrCreateAttendanceCode() });
    } catch (error: unknown) {
      logger.error('[codigo/actual] Error fetching attendance code:', { error });
      return NextResponse.json(
        { success: false, message: 'Error al obtener código de asistencia' },
        { status: 500 }
      );
    }
  }
);
