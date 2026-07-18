import { NextResponse } from 'next/server';
import { withRoute } from '@/lib/api/withRoute';
import { ApiResponse } from '@/lib/api/api-response';
import { query } from '@/lib/database/db';
import { logger } from '@/lib/utils/logger';
import { generateRandomCode4 } from '@/lib/utils/codeUtils';

export const GET = withRoute({ auth: true, audit: true }, async (_request: Request, { user }: { params: any; user: any }) => {
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

    let res = await query<any[]>('SELECT codigo FROM codigos ORDER BY fecha_crea DESC LIMIT 1');
    const isValidCode = res.length > 0 && /^\d{4}$/.test(res[0].codigo);

    if (res.length === 0 || !isValidCode) {
      const newCode = generateRandomCode4();
      const newId = crypto.randomUUID();
      await query('DELETE FROM codigos');
      await query(
        'INSERT INTO codigos (id_codigo, codigo, fecha_crea, estado) VALUES (?, ?, NOW(), ?)',
        [newId, newCode, 1]
      );
      return NextResponse.json({ success: true, codigo: newCode, created: true });
    }

    return NextResponse.json({ success: true, codigo: res[0].codigo });
  } catch (error: unknown) {
    logger.error('[codigo/actual] Error fetching attendance code:', { error });
    return NextResponse.json(
      { success: false, message: 'Error al obtener código de asistencia' },
      { status: 500 }
    );
  }
});
