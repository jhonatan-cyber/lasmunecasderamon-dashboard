import { NextResponse } from 'next/server';
import { withAppApiWrapper } from '@/lib/api/app-api-wrapper';
import { getAuth } from '@/lib/auth/auth-app';
import { getAnticipoBalances } from '@/lib/business/anticiposUtils';
import { AttendanceRepository } from '@/lib/repositories/AttendanceRepository';
import { TipRepository } from '@/lib/repositories/TipRepository';
import { ServiceRepository } from '@/lib/repositories/ServiceRepository';
import { query } from '@/lib/database/db';

export const GET = withAppApiWrapper(async () => {
  const user = await getAuth();
  if (!user)
    return NextResponse.json({ success: false, message: 'No autorizado' }, { status: 401 });

  const userId = user.id.toString();

  // Get attendance stats (sin tipo para evitar conflicto con la sobrecarga del repository)
  const attendanceData = (await AttendanceRepository.getByUser(userId)) as any;
  const totalAsistencias = Array.isArray(attendanceData) ? attendanceData.length : 0;

  // Get tips stats
  const tipsData = (await TipRepository.getByUser(userId)) as any;
  const totalPropinas = Array.isArray(tipsData)
    ? tipsData.reduce((sum: number, tip: any) => sum + Number(tip.monto || 0), 0)
    : 0;

  // Get services stats
  const serviciosData = await ServiceRepository.getByUser(userId);
  const serviciosCompletados = Array.isArray(serviciosData)
    ? serviciosData.filter((s: any) => s.estado === 1).length
    : 0;
  const serviciosEnCurso = Array.isArray(serviciosData)
    ? serviciosData.filter((s: any) => s.estado === 2).length
    : 0;

  // Get anticipo balances
  const anticipoBalances = await getAnticipoBalances(userId);

  // Get user info
  const userRes = await query<any[]>(
    'SELECT nombre, apellido, nick FROM usuarios WHERE id_usuario = ?',
    [userId]
  );
  const userInfo = userRes[0] || {};

  return NextResponse.json({
    success: true,
    data: {
      user: {
        id: userId,
        nombre: userInfo.nombre,
        apellido: userInfo.apellido,
        nick: userInfo.nick
      },
      stats: {
        totalAsistencias,
        totalPropinas,
        serviciosCompletados,
        serviciosEnCurso,
        montoAnticipoMaximo: anticipoBalances.montoMaximo,
        montoAsistencia: anticipoBalances.montoAsistencia,
        montoComisiones: anticipoBalances.montoComision,
        montoPropinas: anticipoBalances.montoPropina
      }
    }
  });
});
