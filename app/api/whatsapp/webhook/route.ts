import { NextResponse } from 'next/server';
import twilio from 'twilio';
import { query } from '@/lib/database/db';
import {
  isApprovalAction,
  parseCierreCajaCommand,
  parseGratificacionCommand,
  normalizeWhatsAppMessage,
  parseAnticipoCommand,
  parseSolicitudResponseCommand
} from '@/lib/integrations/whatsappCommandUtils';
import { processPendingSolicitud } from '@/lib/integrations/whatsappPendingActions';
import { AnticipoService } from '@/lib/services/AnticipoService';
import { CashRegisterService } from '@/lib/services/CashRegisterService';
import { GratificacionService } from '@/lib/services/GratificacionService';
import { formatCurrencyCLP } from '@/lib/utils/formatters';
import { getTwilioConfig } from '@/lib/business/twilioConfig';
import { getAdminWhatsApp } from '@/lib/business/whatsappConfig';

/**
 * Valida la firma de Twilio para evitar solicitudes falsificadas.
 * Twilio firma cada webhook con X-Twilio-Signature usando tu Auth Token.
 * Ver: https://www.twilio.com/docs/usage/webhooks/webhooks-security
 */
async function validateTwilioRequest(request: Request): Promise<boolean> {
  const { authToken } = await getTwilioConfig();
  if (!authToken) {
    return false;
  }

  const signature = request.headers.get('x-twilio-signature');
  if (!signature) {
    return false;
  }

  try {
    // Reconstruir la URL original que Twilio usó para firmar
    const forwardedProto = request.headers.get('x-forwarded-proto');
    const forwardedHost = request.headers.get('x-forwarded-host');
    const url = request.url;

    // Extraer los parámetros POST del body (form-data)
    const formData = await request.clone().formData();
    const params: Record<string, string> = {};
    for (const [key, value] of formData.entries()) {
      if (typeof value === 'string') {
        params[key] = value;
      }
    }

    return twilio.validateRequest(authToken, signature, url, params);
  } catch {
    return false;
  }
}

export async function POST(request: Request) {
  try {
    // Validar firma de Twilio en producción para prevenir suplantación
    if (process.env.NODE_ENV === 'production') {
      const isValid = await validateTwilioRequest(request);
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
      query(
        `SELECT v.id_venta, v.codigo, v.total, COALESCE((CAST(c.nombre AS text) || CAST(' ' AS text) || CAST(c.apellido AS text)), 'Sin cliente registrado') as cliente_nombre, v.fecha_mod FROM ventas v LEFT JOIN clientes c ON v.cliente_id = c.id_cliente WHERE v.estado = 2 ORDER BY v.fecha_mod DESC`
      ),
      query(
        `SELECT s.id_servicio, s.codigo, s.total, COALESCE(c.nombre, 'Sin cliente registrado') as cliente_nombre, s.fecha_mod FROM servicios s LEFT JOIN clientes c ON s.cliente_id = c.id_cliente WHERE s.estado = 2 ORDER BY s.fecha_mod DESC`
      ),
      query(
        `SELECT sac.id as solicitud_id, sac.cuenta_id as id_cuenta, sac.monto, c.codigo, c.total,
                COALESCE(cl.nombre, 'Sin cliente registrado') as cliente_nombre,
                COALESCE(sac.fecha_mod, sac.fecha_crea) as fecha_mod
         FROM solicitudes_anulacion_cuentas sac
         INNER JOIN cuentas c ON c.id_cuenta = sac.cuenta_id
         LEFT JOIN clientes cl ON c.cliente_id = cl.id_cliente
         WHERE sac.estado = 'pendiente'
         ORDER BY COALESCE(sac.fecha_mod, sac.fecha_crea) DESC`
      ),
      query(
        `SELECT a.id_anticipo as id, a.monto, (CAST(u.nombre AS text) || CAST(' ' AS text) || CAST(u.apellido AS text)) as empleado_nombre, u.nick as empleado_nick, a.fecha_crea as fecha_mod FROM anticipos a INNER JOIN usuarios u ON a.usuario_id = u.id_usuario WHERE a.estado = 2 ORDER BY a.fecha_crea DESC`
      ),
      query(
        `SELECT s.id, s.token, s.caja_id, s.solicitado_por, s.monto_cierre_calculado,
                  s.saldo_clientes_descontado, s.fecha_solicitud as fecha_mod
           FROM solicitudes_cierre_caja s
           WHERE s.estado = 'pendiente'
           ORDER BY s.fecha_solicitud DESC`
      )
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
            ? `Caja cerrada con ${formatCurrencyCLP(resultado.caja?.monto_cierre || 0)} (descontados ${formatCurrencyCLP(resultado.saldo_clientes_descontado)} de saldos de clientes).`
            : 'Cierre de caja rechazado: la caja sigue abierta.'
      });
    }

    const comandoAnticipo = parseAnticipoCommand(mensaje);
    if (comandoAnticipo) {
      const result = await AnticipoService.processAnticipoFromCommand(
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
        message: `Caja cerrada con ${formatCurrencyCLP(resultado.caja?.monto_cierre || 0)} (descontados ${formatCurrencyCLP(resultado.saldo_clientes_descontado)} de saldos de clientes).`
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
