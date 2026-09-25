import { NextResponse } from 'next/server';
import { withRoute } from '@/lib/api/withRoute';
import { CommissionService } from '@/lib/services/CommissionService';

// `CommissionRepository.getDetails` devuelve `estado` como texto legible
// ('Por pagar' | 'Pagado' | 'Anulado'); las pantallas de eventos financieros
// (Expo y Flutter) filtran por estado numérico (1 | 2 | 0), igual que en
// /tips?tipo=detalle.
const ESTADO_TEXTO_A_NUMERICO: Record<string, number> = {
  'Por pagar': 1,
  Pagado: 2,
  Anulado: 0
};

export const GET = withRoute(
  { auth: true, access: 'authenticated', audit: true },
  async (request: Request, { user }: { params: any; user: any }) => {
    const { searchParams } = new URL(request.url);
    const tipo = searchParams.get('tipo');
    const status = searchParams.get('status') || undefined;

    // Paridad con /tips?tipo=detalle: filas por comisión para «Eventos
    // Financieros». El default sigue siendo la fila agregada por usuario
    // (venta/servicio/total/status) que consumen las pantallas de comisiones.
    if (tipo === 'detalle') {
      const rows = await CommissionService.getDetails(user.id);
      const data = rows.map((r: any) => ({
        id: r.id,
        fecha_crea: r.fecha_hora,
        codigo: r.codigo_venta ?? r.codigo_servicio ?? null,
        codigo_venta: r.codigo_venta ?? null,
        tipo: r.tipo,
        monto: Number(r.monto ?? 0),
        estado: ESTADO_TEXTO_A_NUMERICO[r.estado] ?? 1,
        producto: r.producto ?? null,
        fecha_pago: r.fecha_pago ?? null
      }));
      return NextResponse.json({ success: true, data });
    }

    const data = await CommissionService.list({ employeeId: user.id, status });
    return NextResponse.json({ success: true, data });
  }
);
