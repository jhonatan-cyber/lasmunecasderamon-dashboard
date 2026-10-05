import { NextResponse } from 'next/server';
import { withRoute } from '@/lib/api/withRoute';
import { getAnticipoBalances } from '@/modules/personal';
import { TipService } from '@/lib/services/TipService';
import { ServiceService } from '@/lib/services/ServiceService';
import { query } from '@/lib/database/db';
import { listarAsistenciasDeUsuario } from '@/modules/asistencia';

export const GET = withRoute(
  { auth: true, access: 'authenticated', audit: true },
  async (_request: Request, { user }: { params: any; user: any }) => {
    const userId = user.id.toString();

    const attendanceData = (await listarAsistenciasDeUsuario(userId)) as any;
    const totalAsistencias = Array.isArray(attendanceData) ? attendanceData.length : 0;

    const tipsData = (await TipService.getByUser(userId)) as any;
    const totalPropinas = Array.isArray(tipsData)
      ? tipsData.reduce((sum: number, tip: any) => sum + Number(tip.monto || 0), 0)
      : 0;

    const serviciosData = await ServiceService.getByUser(userId);
    const serviciosCompletados = Array.isArray(serviciosData)
      ? serviciosData.filter((s: any) => s.estado === 1).length
      : 0;
    const serviciosEnCurso = Array.isArray(serviciosData)
      ? serviciosData.filter((s: any) => s.estado === 2).length
      : 0;

    const anticipoBalances = await getAnticipoBalances(userId);

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
  }
);
