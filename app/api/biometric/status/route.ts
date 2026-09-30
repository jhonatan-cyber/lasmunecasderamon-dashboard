import { NextResponse } from 'next/server';
import { withRoute } from '@/lib/api/withRoute';
import { obtenerEstadoBiometrico } from '@/lib/biometric/statusService';

/** Estado del subsistema biométrico (Configuraciones → Asistencia). */
export const GET = withRoute({ auth: true, access: 'administrator' }, async () => {
  const estado = await obtenerEstadoBiometrico();
  return NextResponse.json(
    { success: true, data: estado },
    { headers: { 'Cache-Control': 'no-store' } }
  );
});
