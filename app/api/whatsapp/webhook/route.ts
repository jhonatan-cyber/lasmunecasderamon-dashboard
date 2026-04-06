import { NextResponse } from 'next/server';
import { query } from '@/lib/database/db';
import {
  isApprovalAction,
  normalizeWhatsAppMessage,
  parseAnticipoCommand,
  parseSolicitudResponseCommand
} from '@/lib/integrations/whatsappCommandUtils';
import { processPendingSolicitud } from '@/lib/integrations/whatsappPendingActions';
import { AnticipoService } from '@/lib/services/AnticipoService';

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const Body = formData.get('Body')?.toString();
    const From = formData.get('From')?.toString();

    if (!Body || !From) return NextResponse.json({ error: 'Datos incompletos' }, { status: 400 });

    const mensaje = normalizeWhatsAppMessage(Body);
    const numeroRemitente = From.replace('whatsapp:', '');
    const adminWhatsApp =
      process.env.ADMIN_WHATSAPP_NUMBER?.replace('whatsapp:', '') || '59172419112';

    if (numeroRemitente !== adminWhatsApp) return NextResponse.json({ message: 'No autorizado' });

    // Fetch pending items (logic from original handler)
    const [ventasPendientes, serviciosPendientes, cuentasPendientes, anticiposPendientes] = await Promise.all([
      query(
        `SELECT v.id_venta, v.codigo, v.total, COALESCE(CONCAT(c.nombre, " ", c.apellido), 'Sin cliente registrado') as cliente_nombre, v.fecha_mod FROM ventas v LEFT JOIN clientes c ON v.id_cliente = c.id_cliente WHERE v.estado = 2 ORDER BY v.fecha_mod DESC`
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
        `SELECT a.id_anticipo as id, a.monto, CONCAT(u.nombre, ' ', u.apellido) as empleado_nombre, u.nick as empleado_nick, a.fecha_crea as fecha_mod FROM anticipos a INNER JOIN usuarios u ON a.usuario_id = u.id_usuario WHERE a.estado = 2 ORDER BY a.fecha_crea DESC`
      )
    ]);

    const todasLasSolicitudes = [
      ...(ventasPendientes as any[]).map(v => ({ ...v, tipo: 'venta' })),
      ...(serviciosPendientes as any[]).map(s => ({ ...s, tipo: 'servicio' })),
      ...(cuentasPendientes as any[]).map(c => ({ ...c, tipo: 'cuenta' }))
    ].sort((a, b) => new Date(b.fecha_mod).getTime() - new Date(a.fecha_mod).getTime());

    if (todasLasSolicitudes.length === 0 && (anticiposPendientes as any[]).length === 0) {
      return NextResponse.json({ message: 'No hay solicitudes pendientes' });
    }

    // Command parsing (logic from original handler)
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

    const respuestaEspecifica = parseSolicitudResponseCommand(mensaje);
    if (respuestaEspecifica) {
      const { index, action } = respuestaEspecifica;
      if (index >= 0 && index < todasLasSolicitudes.length) {
        await processPendingSolicitud(
          todasLasSolicitudes[index],
          isApprovalAction(action) ? 'confirmar' : 'rechazar',
          adminWhatsApp
        );
        return NextResponse.json({ message: 'Procesado' });
      }
    }

    if (['si', 'confirmar', 'aprobar'].includes(mensaje) && todasLasSolicitudes.length > 0) {
      await processPendingSolicitud(todasLasSolicitudes[0], 'confirmar', adminWhatsApp);
      return NextResponse.json({ message: 'Confirmado' });
    }

    if (['no', 'rechazar'].includes(mensaje) && todasLasSolicitudes.length > 0) {
      await processPendingSolicitud(todasLasSolicitudes[0], 'rechazar', adminWhatsApp);
      return NextResponse.json({ message: 'Rechazado' });
    }

    return NextResponse.json({ message: 'Mensaje no reconocido' });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
