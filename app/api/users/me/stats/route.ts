import { NextResponse } from 'next/server';
import { withRoute } from '@/lib/api/withRoute';
import { getAnticipoBalances } from '@/modules/personal';
import { TipService } from '@/modules/personal';
import { ServiceService } from '@/modules/operacion';
import { listarAsistenciasDeUsuario } from '@/modules/asistencia';
import { obtenerResumenUsuario } from '@/modules/identidad';

function getCurrentMonthRange() {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const startDate = new Date(year, month, 1).toISOString().substring(0, 10);
  const endDate = new Date(year, month + 1, 0).toISOString().substring(0, 10);
  return { startDate, endDate };
}

export const GET = withRoute(
  { auth: true, access: 'authenticated', audit: true },
  async (_request: Request, { user }: { params: any; user: any }) => {
    const userId = user.id.toString();

    const { startDate, endDate } = getCurrentMonthRange();
    const attendanceData = (await listarAsistenciasDeUsuario(
      userId,
      undefined,
      startDate,
      endDate
    )) as any;
    // Contar solo asistencias no pagadas (estado = 1)
    const totalAsistencias = Array.isArray(attendanceData)
      ? attendanceData.filter((a: any) => Number(a.estado) === 1).length
      : 0;

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

    const userInfo = (await obtenerResumenUsuario(userId)) ?? {
      nombre: '',
      apellido: '',
      nick: null
    };

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
          montoComisionVenta: anticipoBalances.montoComisionVenta,
          montoComisionServicio: anticipoBalances.montoComisionServicio,
          montoPropinas: anticipoBalances.montoPropina,
          montoHorasExtras: anticipoBalances.montoHorasExtras,
          montoGratificaciones: anticipoBalances.montoGratificaciones,
          montoAnticipos: anticipoBalances.montoAnticipos
        }
      }
    });
  }
);
