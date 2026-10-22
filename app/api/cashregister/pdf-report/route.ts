import { withPublicRoute } from '@/lib/api/withRoute';
import { leerTokenCajaReporte } from '@/lib/api/cajaReportePdfToken';
import { CashRegisterService, generarPdfCierreCaja } from '@/modules/caja';
import { VentasStatsService } from '@/modules/reportes';
import { montoCierreCaja } from '@/lib/business/cajaEfectivo';
import logger from '@/lib/utils/logger';

export const runtime = 'nodejs';

/** Reporte temporal firmado: Twilio puede descargar el PDF sin una sesión del dashboard. */
export const GET = withPublicRoute(async request => {
  const token = new URL(request.url).searchParams.get('token')?.trim();
  if (!token || token.length > 2048) {
    return Response.json({ success: false, message: 'Token inválido' }, { status: 400 });
  }

  const cajaId = await leerTokenCajaReporte(token);
  if (!cajaId) {
    return Response.json(
      { success: false, message: 'El enlace del reporte expiró o no es válido' },
      { status: 401 }
    );
  }

  const caja = await CashRegisterService.getById(cajaId);
  if (!caja) {
    return Response.json({ success: false, message: 'Caja no encontrada' }, { status: 404 });
  }

  let productos: Array<{ producto: string; unidades: number; monto: number }> = [];
  try {
    productos = await VentasStatsService.getVentasPorProducto(cajaId);
  } catch (error) {
    logger.warn('No se pudo cargar el ranking de productos para el reporte de caja', {
      cajaId,
      errorType: error instanceof Error ? error.name : typeof error
    });
  }

  const estado = caja.cierre_pendiente
    ? 'Pendiente de autorización'
    : caja.estado === 1
      ? 'Abierta'
      : 'Cerrada';
  const pdf = await generarPdfCierreCaja({
    ...caja,
    caja_id: caja.id_caja,
    estado,
    venta: caja.ventas,
    servicio: caja.servicios,
    devolucion: caja.devoluciones,
    monto_cierre_calculado:
      caja.monto_cierre ?? montoCierreCaja(caja, caja.prepago_pendiente_clientes),
    ventas_por_producto: productos
  });

  return new Response(new Uint8Array(pdf), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="reporte-caja-${String(cajaId).slice(0, 8)}.pdf"`,
      'Content-Length': String(pdf.byteLength),
      'Cache-Control': 'no-store, max-age=0',
      'X-Content-Type-Options': 'nosniff'
    }
  });
});
