import { NextResponse } from 'next/server';
import { withAppApiWrapper } from '@/lib/api/app-api-wrapper';
import { query } from '@/lib/database/db';
import { getAuth } from '@/lib/auth/auth-app';

export const GET = withAppApiWrapper(async () => {
  const user = await getAuth();
  if (!user)
    return NextResponse.json({ success: false, message: 'No autorizado' }, { status: 401 });

  const role = user.role.toLowerCase();
  if (role !== 'administrador' && role !== 'cajero') {
    return NextResponse.json({ success: false, message: 'Acceso denegado' }, { status: 403 });
  }

  const res = await query<any[]>('SELECT codigo FROM codigos ORDER BY fecha_crea DESC LIMIT 1');
  if (res.length === 0)
    return NextResponse.json({ success: false, message: 'No hay código' }, { status: 404 });

  return NextResponse.json({ success: true, codigo: res[0].codigo });
});
