import { NextResponse } from 'next/server';
import { validarWebhookTwilio } from '@/lib/integrations/twilioWebhook';
import {
  isApprovalAction,
  parseCierreCajaCommand,
  parseGratificacionCommand,
  normalizeWhatsAppMessage,
  parseAnticipoCommand,
  parseSolicitudResponseCommand
} from '@/lib/integrations/whatsappCommandUtils';
import { processPendingSolicitud } from '@/workflows/anulaciones-whatsapp';
import { listarAnticiposPendientes, procesarAnticipoDesdeComando } from '@/modules/personal';
import { listarSolicitudesCierrePendientes } from '@/modules/caja';
import { listarServiciosEnCurso, listarSolicitudesCuentasPendientes } from '@/modules/operacion';
import { listarVentasEnCurso } from '@/modules/ventas';
import { CashRegisterService } from '@/modules/caja';
import { GratificacionService } from '@/modules/personal';
import { formatCurrencyCLP } from '@/lib/utils/formatters';
import { getAdminWhatsApp } from '@/lib/business/whatsappConfig';

export async function POST(request: Request) {
  try {
    // Validar firma de Twilio en producción para prevenir suplantación
    if (process.env.NODE_ENV === 'production') {
      const isValid = await validarWebhookTwilio(request);
      if (!isValid) {
        return NextResponse.json(
          { error: 'Firma inválida: solicitud no autorizada' },
          { status: 403 }
        );
      }
    }

    const formData = await request.formData();
    const Body = formData.get('Body')?.toString();
    const From = formData.get('From')?.toString();

    if (!Body || !From) return NextResponse.json({ error: 'Datos incompletos' }, { status: 400 });

    const mensaje = normalizeWhatsAppMessage(Body);
    const numeroRemitente = From.replace('whatsapp:', '');
    const adminWhatsApp = await getAdminWhatsApp();

    if (!adminWhatsApp) {
      return NextResponse.json(
        { error: 'WhatsApp del administrador no configurado (Configuraciones → WhatsApp)' },
        { status: 500 }
      );
    }

    if (numeroRemitente !== adminWhatsApp) return NextResponse.json({ message: 'No autorizado' });

    const [
      ventasPendientes,
      serviciosPendientes,
      cuentasPendientes,
      anticiposPendientes,
      cierresPendientes
    ] = await Promise.all([
      listarVentasEnCurso(),
      listarServiciosEnCurso(),
      listarSolicitudesCuentasPendientes(),
      listarAnticiposPendientes(),
      listarSolicitudesCierrePendientes()
    ]);

    const todasLasSolicitudes = [
      ...(ventasPendientes as any[]).map(v => ({ ...v, tipo: 'venta' })),
      ...(serviciosPendientes as any[]).map(s => ({ ...s, tipo: 'servicio' })),
      ...(cuentasPendientes as any[]).map(c => ({ ...c, tipo: 'cuenta' }))
    ].sort((a, b) => new Date(b.fecha_mod).getTime() - new Date(a.fecha_mod).getTime());

    const cierres = cierresPendientes as any[];

    if (
      todasLasSolicitudes.length === 0 &&
      (anticiposPendientes as any[]).length === 0 &&
      cierres.length === 0
    ) {
      return NextResponse.json({ message: 'No hay solicitudes pendientes' });
    }

    /**
     * Cierre de caja: `cierre si` / `cierre no` resuelve el cierre pendiente más
     * antiguo. Va con la palabra "cierre" delante a propósito, porque un "SI"
     * suelto puede estar respondiendo a la lista de anulaciones.
     */
    const comandoCierre = parseCierreCajaCommand(mensaje);
    if (comandoCierre) {
      if (cierres.length === 0) {
        return NextResponse.json({ message: 'No hay cierres de caja pendientes' });
      }

      const resultado = await CashRegisterService.procesarCierreCaja({
        token: cierres[0].token,
        action: comandoCierre.action === 'autorizar' ? 'confirmar' : 'rechazar',
        usuarioId: null,
        resueltoPor: 'Administrador (WhatsApp)'
      });

      return NextResponse.json({
        message:
          resultado.estado === 'aprobada'
            ? `Caja cerrada con ${formatCurrencyCLP(resultado.caja?.monto_cierre || 0)} (descontados ${formatCurrencyCLP(resultado.saldo_clientes_descontado)} de saldos de clientes; falta devolver ${formatCurrencyCLP(resultado.saldo_clientes_por_devolver)}).`
            : 'Cierre de caja rechazado: la caja sigue abierta.'
      });
    }

    const comandoAnticipo = parseAnticipoCommand(mensaje);
    if (comandoAnticipo) {
      const result = await procesarAnticipoDesdeComando(
        (anticiposPendientes as any[]).map(a => ({ ...a, tipo: 'anticipo' })),
        comandoAnticipo.anticipoId,
        comandoAnticipo.action === 'aprobar',
        adminWhatsApp
      );
      return NextResponse.json({ message: result.message });
    }

    const comandoGratificacion = parseGratificacionCommand(mensaje);
    if (comandoGratificacion) {
      await GratificacionService.processSolicitud(
        comandoGratificacion.gratificacionId,
        comandoGratificacion.action === 'aprobar' ? 'approve' : 'reject'
      );
      return NextResponse.json({
        message: `Gratificación ${comandoGratificacion.action === 'aprobar' ? 'aprobada' : 'rechazada'} correctamente.`
      });
    }

    const respuestaEspecifica = parseSolicitudResponseCommand(mensaje);
    if (respuestaEspecifica) {
      const { index, action } = respuestaEspecifica;
      if (index >= 0 && index < todasLasSolicitudes.length) {
        await processPendingSolicitud(
          todasLasSolicitudes[index],
          isApprovalAction(action) ? 'confirmar' : 'rechazar'
        );
        return NextResponse.json({ message: 'Procesado' });
      }
    }

    if (['si', 'confirmar', 'aprobar'].includes(mensaje) && todasLasSolicitudes.length > 0) {
      await processPendingSolicitud(todasLasSolicitudes[0], 'confirmar');
      return NextResponse.json({ message: 'Confirmado' });
    }

    // "SI" suelto sin anulaciones esperando: es el cierre de caja.
    if (['si', 'confirmar', 'aprobar'].includes(mensaje) && cierres.length > 0) {
      const resultado = await CashRegisterService.procesarCierreCaja({
        token: cierres[0].token,
        action: 'confirmar',
        usuarioId: null,
        resueltoPor: 'Administrador (WhatsApp)'
      });
      return NextResponse.json({
        message: `Caja cerrada con ${formatCurrencyCLP(resultado.caja?.monto_cierre || 0)} (descontados ${formatCurrencyCLP(resultado.saldo_clientes_descontado)} de saldos de clientes; falta devolver ${formatCurrencyCLP(resultado.saldo_clientes_por_devolver)}).`
      });
    }

    if (
      ['no', 'rechazar'].includes(mensaje) &&
      cierres.length > 0 &&
      todasLasSolicitudes.length === 0
    ) {
      await CashRegisterService.procesarCierreCaja({
        token: cierres[0].token,
        action: 'rechazar',
        usuarioId: null,
        resueltoPor: 'Administrador (WhatsApp)'
      });
      return NextResponse.json({
        message: 'Cierre de caja rechazado: la caja sigue abierta.'
      });
    }

    if (['no', 'rechazar'].includes(mensaje) && todasLasSolicitudes.length > 0) {
      await processPendingSolicitud(todasLasSolicitudes[0], 'rechazar');
      return NextResponse.json({ message: 'Rechazado' });
    }

    return NextResponse.json({ message: 'Mensaje no reconocido' });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Error desconocido';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
