import { NextApiRequest, NextApiResponse } from 'next';
import { query } from '@/lib/db';
import { enviarWhatsApp } from '@/lib/whatsappService';
import { buildMultipleSolicitudesPendingMessage } from '@/lib/notificationMessages';
import {
  isApprovalAction,
  normalizeWhatsAppMessage,
  parseAnticipoCommand,
  parseSolicitudResponseCommand,
} from '@/lib/whatsappCommandUtils';
import { processPendingSolicitud } from '@/lib/whatsappPendingActions';
import { processAnticipoCommand } from '@/lib/whatsappAnticipoActions';

type VentaPendiente = {
  id_venta: string;
  codigo: string;
  total: number;
  cliente_nombre: string;
  fecha_mod: string;
  tipo: 'venta';
};

type ServicioPendiente = {
  id_servicio: string;
  codigo: string;
  total: number;
  cliente_nombre: string;
  fecha_mod: string;
  tipo: 'servicio';
};

type Pendiente = VentaPendiente | ServicioPendiente;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  try {
    const { Body, From } = req.body;

    // Verificar que es un mensaje de WhatsApp
    if (!Body || !From) {
      return res.status(400).json({ error: 'Datos incompletos' });
    }

    const mensaje = normalizeWhatsAppMessage(Body);
    const numeroRemitente = From.replace('whatsapp:', '');

    // Verificar que el mensaje viene del administrador
    const adminWhatsApp =
      process.env.ADMIN_WHATSAPP_NUMBER?.replace('whatsapp:', '') || '59172419112';

    if (numeroRemitente !== adminWhatsApp) {
      return res.status(200).json({ message: 'No autorizado' });
    }

    // Buscar ventas pendientes de anulación
    const ventasPendientesSql = `
      SELECT 
        v.id_venta,
        v.codigo,
        v.total,
        COALESCE(CONCAT(c.nombre, " ", c.apellido), 'Sin cliente registrado') as cliente_nombre,
        v.fecha_mod
      FROM ventas v
      LEFT JOIN clientes c ON v.cliente_id = c.id_cliente
      WHERE v.estado = 2
      ORDER BY v.fecha_mod DESC
    `;

    const ventasPendientes = (await query(ventasPendientesSql)) as Omit<VentaPendiente, 'tipo'>[];

    // Buscar servicios pendientes de devolución
    const serviciosPendientesSql = `
      SELECT 
        s.id_servicio,
        s.codigo,
        s.total,
        COALESCE(c.nombre, 'Sin cliente registrado') as cliente_nombre,
        s.fecha_mod
      FROM servicios s
      LEFT JOIN clientes c ON s.cliente_id = c.id_cliente
      WHERE s.estado = 2
      ORDER BY s.fecha_mod DESC
    `;

    const serviciosPendientes = (await query(serviciosPendientesSql)) as Omit<ServicioPendiente, 'tipo'>[];

    // Buscar anticipos pendientes de aprobación (estado = 2)
    const anticiposPendientesSql = `
      SELECT 
        a.id_anticipo as id,
        a.monto,
        CONCAT(u.nombre, ' ', u.apellido) as empleado_nombre,
        u.nick as empleado_nick,
        a.fecha_crea as fecha_mod
      FROM anticipos a
      INNER JOIN usuarios u ON a.usuario_id = u.id_usuario
      WHERE a.estado = 2
      ORDER BY a.fecha_crea DESC
    `;

    const anticiposPendientes = await query(anticiposPendientesSql) as Array<{
      id: string;
      monto: number;
      empleado_nombre: string;
      empleado_nick: string;
      fecha_mod: string;
      telefono?: string | null;
    }>;

    // Combinar todas las solicitudes pendientes
    const todasLasSolicitudes = ([
      ...ventasPendientes.map((v) => ({ ...v, tipo: 'venta' as const })),
      ...serviciosPendientes.map((s) => ({ ...s, tipo: 'servicio' as const })),
    ] as Pendiente[]).sort((a, b) => new Date(b.fecha_mod).getTime() - new Date(a.fecha_mod).getTime());

    if (todasLasSolicitudes.length === 0) {
      return res.status(200).json({ message: 'No hay solicitudes pendientes' });
    }

    // Si hay múltiples solicitudes pendientes, mostrar lista
    if (todasLasSolicitudes.length > 1) {
      const mensajeLista = buildMultipleSolicitudesPendingMessage(
        todasLasSolicitudes.map((s) => ({
          tipo: s.tipo,
          codigo: s.codigo,
          clienteNombre: s.cliente_nombre,
          total: s.total,
        }))
      );

      await enviarWhatsApp(adminWhatsApp, mensajeLista);
      return res.status(200).json({ message: 'Múltiples solicitudes pendientes' });
    }

    const solicitudPendiente = todasLasSolicitudes[0];

    const respuestaEspecifica = parseSolicitudResponseCommand(mensaje);
    const comandoAnticipo = parseAnticipoCommand(mensaje);

    if (comandoAnticipo) {
      const result = await processAnticipoCommand(
        anticiposPendientes.map((a) => ({
          ...a,
          tipo: 'anticipo' as const,
        })),
        comandoAnticipo.anticipoId,
        comandoAnticipo.action === 'aprobar',
        adminWhatsApp
      );

      return res.status(200).json({ message: result.message });
    }

    if (respuestaEspecifica) {
      const numeroSolicitud = respuestaEspecifica.index;
      const accion = respuestaEspecifica.action;

      if (numeroSolicitud >= 0 && numeroSolicitud < todasLasSolicitudes.length) {
        const solicitudSeleccionada = todasLasSolicitudes[numeroSolicitud];
        const esConfirmacion = isApprovalAction(accion);

        await processPendingSolicitud(
          solicitudSeleccionada,
          esConfirmacion ? 'confirmar' : 'rechazar',
          adminWhatsApp
        );
      } else {
        return res.status(200).json({ message: 'Número de solicitud inválido' });
      }
    } else if (mensaje === 'si' || mensaje === 'confirmar' || mensaje === 'confirmo' || mensaje === 'aprobar') {
      await processPendingSolicitud(solicitudPendiente, 'confirmar', adminWhatsApp);
    } else if (mensaje === 'no' || mensaje === 'rechazar' || mensaje === 'rechazo') {
      await processPendingSolicitud(solicitudPendiente, 'rechazar', adminWhatsApp);
    } else {
      return res.status(200).json({ message: 'Mensaje no reconocido' });
    }

    return res.status(200).json({ message: 'Procesado correctamente' });
  } catch {
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
}
