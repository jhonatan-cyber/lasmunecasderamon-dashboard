import { NextResponse } from 'next/server';
import { withAppApiWrapper } from '@/lib/api/app-api-wrapper';
import { query } from '@/lib/database/db';
import { getAuth } from '@/lib/auth/auth-app';
import { logger } from '@/lib/utils/logger';
import { generateRandomCode4 } from '@/lib/utils/codeUtils';

export const GET = withAppApiWrapper(async () => {
  const user = await getAuth();
  if (!user)
    return NextResponse.json({ success: false, message: 'No autorizado' }, { status: 401 });

  const role = user.role.toLowerCase();
  if (role !== 'administrador' && role !== 'cajero') {
    return NextResponse.json({ success: false, message: 'Acceso denegado' }, { status: 403 });
  }

  try {
    // Verificar si hay códigos en la tabla
    let res = await query<any[]>('SELECT codigo FROM codigos ORDER BY fecha_crea DESC LIMIT 1');
    
    // Si no hay códigos, crear uno automáticamente
    if (res.length === 0) {
      const newCode = generateRandomCode4();
      const newId = crypto.randomUUID();
      
      await query(
        'INSERT INTO codigos (id_codigo, codigo, fecha_crea, estado) VALUES (?, ?, NOW(), ?)',
        [newId, newCode, 1]
      );
      
      return NextResponse.json({ success: true, codigo: newCode, created: true });
    }

    return NextResponse.json({ success: true, codigo: res[0].codigo });
  } catch (error: any) {
    logger.error('[codigo/actual] Error fetching attendance code:', error);
    return NextResponse.json({ 
      success: false, 
      message: 'Error al obtener código de asistencia',
      error: error.message 
    }, { status: 500 });
  }
});
