import { withPublicRoute } from '@/lib/api/withRoute';
import { CashRegisterService, generarPdfCierreCaja } from '@/modules/caja';

export const runtime = 'nodejs';

/** PDF de una caja ya cerrada. El token de solicitud es el acceso de un solo turno. */
export const GET = withPublicRoute(async request => {
  const token = new URL(request.url).searchParams.get('token')?.trim();
  if (!token || token.length > 256) {
    return Response.json({ success: false, message: 'Token inválido' }, { status: 400 });
  }

  const solicitud = await CashRegisterService.getSolicitudCierreByToken(token);
  if (!solicitud) {
    return Response.json({ success: false, message: 'Cierre no encontrado' }, { status: 404 });
  }
  if (solicitud.estado !== 'aprobada') {
    return Response.json(
      { success: false, message: 'La caja todavía no está cerrada' },
      { status: 409 }
    );
  }

  const pdf = await generarPdfCierreCaja(solicitud);
  return new Response(new Uint8Array(pdf), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="cierre-caja-${String(solicitud.caja_id).slice(0, 8)}.pdf"`,
      'Content-Length': String(pdf.byteLength),
      'Cache-Control': 'private, no-store, max-age=0',
      'X-Content-Type-Options': 'nosniff'
    }
  });
});
