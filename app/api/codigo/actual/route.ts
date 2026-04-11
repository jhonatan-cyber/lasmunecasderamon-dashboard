import { NextResponse } from 'next/server';
import { withAppAuth } from '@/lib/api/app-api-wrapper';
import { query } from '@/lib/database/db';
import { logger } from '@/lib/utils/logger';
import { generateRandomCode4 } from '@/lib/utils/codeUtils';

export const GET = withAppAuth(
  async () => {
    try {
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
  },
  { requiredPermission: { module: 'settings', action: 'read' } }
);
