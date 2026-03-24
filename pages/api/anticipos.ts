/* eslint-disable */
import type { NextApiRequest, NextApiResponse } from "next";
import { query, generateUUID } from "@/lib/db";
import { withTransaction } from "@/lib/transactionUtils";
import { enviarWhatsApp } from "@/lib/whatsappService";
import { withAuth } from "@/lib/middleware/auth";
import { sendNotificationToAll } from "./notifications/sse";
import { formatCurrencyCLP } from "@/lib/formatters";
import { buildAnticipoRequestMessage } from "@/lib/notificationMessages";
import { getAnticipoBalances } from "@/lib/anticiposUtils";
import { getNowInBusinessTimezone } from "@/lib/timezoneService";

type CajaRow = {
  id_caja: string | number;
  efectivo: number | string | null;
  anticipo: number | string | null;
};

type AuthenticatedRequest = NextApiRequest & {
  user?: {
    id?: string | number;
  };
};

async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
  if (req.method === "POST") {
    const { action } = req.body;
    
    if (action === "solicitar") {
      return await manejarSolicitudAnticipo(req, res);
    }
    
    const { usuario_id, monto } = req.body;
    if (!usuario_id || !monto || isNaN(Number(monto))) {
      return res.status(400).json({ success: false, message: "usuario_id y monto son requeridos" });
    }

    try {
      const { montoMaximo } = await getAnticipoBalances(
        String(usuario_id)
      );

      const montoSolicitado = Number(monto);
      const otorgar = montoSolicitado <= montoMaximo;

      if (otorgar) {
        try {
          const result = await withTransaction(async (trx) => {
            const id_anticipo = generateUUID();
            const now = getNowInBusinessTimezone();
            // 1. Insertar el anticipo
            await trx(
              "INSERT INTO anticipos (id_anticipo, usuario_id, monto, fecha_crea) VALUES (?, ?, ?, ?)",
              [id_anticipo, usuario_id, montoSolicitado, now]
            );

            // 2. Obtener la caja abierta actual
            const cajaResult = (await trx(`
              SELECT id_caja, efectivo, anticipo 
              FROM cajas 
              WHERE estado = 1 
              ORDER BY fecha_apertura DESC 
              LIMIT 1
            `)) as CajaRow[];
            const cajaActual = cajaResult[0];

            if (!cajaActual) {
              throw new Error("No hay una caja abierta para procesar el anticipo");
            }

            // 3. Verificar que hay suficiente efectivo
            const efectivoDisponible = Number(cajaActual.efectivo || 0);
            if (efectivoDisponible < montoSolicitado) {
              throw new Error(`No hay suficiente efectivo en caja. Disponible: $${efectivoDisponible}, Solicitado: $${montoSolicitado}`);
            }

            // 4. Actualizar la caja: restar del efectivo y sumar al anticipo
            const nuevoEfectivo = efectivoDisponible - montoSolicitado;
            const nuevoAnticipo = Number(cajaActual.anticipo || 0) + montoSolicitado;

            await trx(
              `UPDATE cajas 
               SET efectivo = ?, anticipo = ? 
               WHERE id_caja = ?`,
              [nuevoEfectivo, nuevoAnticipo, cajaActual.id_caja]
            );

            return {
              caja_actualizada: true,
              efectivo_restante: nuevoEfectivo,
              anticipo_total: nuevoAnticipo
            };
          });

          return res.status(201).json({ 
            success: true, 
            message: `Anticipo otorgado correctamente. Se descontó $${montoSolicitado} del efectivo de caja.`,
            ...result
          });
        } catch (error) {
          return res.status(400).json({ 
            success: false, 
            message: error instanceof Error ? error.message : "Error al procesar el anticipo" 
          });
        }
      } else {
        return res.status(400).json({
          success: false,
          message: `No se puede otorgar el anticipo solicitado. El monto máximo disponible es $${montoMaximo}`,
          maximo: montoMaximo,
        });
      }
    } catch (error) {
      return res.status(500).json({ success: false, message: "Error interno del servidor" });
    }
  }

  if (req.method === "PUT") {
    const { id_anticipo, estado } = req.body;
    if (!id_anticipo) {
      return res.status(400).json({ success: false, message: "id_anticipo es requerido" });
    }

    try {
      const now = getNowInBusinessTimezone();
      await query("UPDATE anticipos SET estado = ?, fecha_mod = ? WHERE id_anticipo = ?", [estado ?? 0, now, id_anticipo]);
      return res.status(200).json({ success: true, message: "Anticipo actualizado correctamente" });
    } catch (error) {
      return res.status(500).json({ success: false, message: "Error al actualizar anticipo" });
    }
  }

  if (req.method === "GET") {
    try {
      const anticipos = await query(
        `SELECT A.id_anticipo, U.id_usuario, CONCAT(U.nombre, ' ', U.apellido) AS usuario, A.fecha_crea, A.monto, A.estado
         FROM anticipos A
         INNER JOIN usuarios U ON U.id_usuario = A.usuario_id
         ORDER BY A.fecha_crea DESC`
      );
      return res.status(200).json({ success: true, data: anticipos });
    } catch (error) {
      return res.status(500).json({ success: false, message: "Error al obtener anticipos" });
    }
  }

  return res.status(405).json({ success: false, message: "Método no permitido" });
}

export default withAuth(handler);

async function manejarSolicitudAnticipo(req: AuthenticatedRequest, res: NextApiResponse) {
  const { monto, motivo } = req.body;
  const usuarioLogueado = req.user;
  
  if (!usuarioLogueado || !usuarioLogueado.id) {
    return res.status(401).json({ success: false, message: "Usuario no autenticado" });
  }
  
  const usuario_id = usuarioLogueado.id;
  const montoSolicitado = Number(monto);
  
  if (!montoSolicitado || montoSolicitado <= 0) {
    return res.status(400).json({ success: false, message: "El monto debe ser mayor a 0" });
  }
  
  try {
    const usuarioResult = await query(
      `SELECT nombre, apellido, nick, telefono FROM usuarios WHERE id_usuario = ?`,
      [usuario_id]
    ) as any[];
    
    if (!usuarioResult || usuarioResult.length === 0) {
      return res.status(404).json({ success: false, message: "Usuario no encontrado" });
    }
    
    const usuario = usuarioResult[0];
    const nombreCompleto = `${usuario.nombre} ${usuario.apellido}`;
    
    const anticiposPendientes = await query(
      `SELECT COUNT(*) as count FROM anticipos WHERE usuario_id = ? AND estado = 2`,
      [usuario_id]
    ) as any[];
    
    if (Number(anticiposPendientes[0].count || 0) > 0) {
      return res.status(400).json({ 
        success: false, 
        message: "Ya tienes una solicitud de anticipo pendiente." 
      });
    }
    
    const { montoAsistencia, montoComision, montoPropina, montoMaximo } = await getAnticipoBalances(
      String(usuario_id)
    );
    
    if (montoSolicitado > montoMaximo) {
      return res.status(400).json({
        success: false,
        message: `El monto excede el máximo (${formatCurrencyCLP(montoMaximo)})`,
        monto_maximo: montoMaximo
      });
    }
    
    const anticipoId = generateUUID();
    const now = getNowInBusinessTimezone();
    await query(
      `INSERT INTO anticipos (id_anticipo, usuario_id, monto, estado, fecha_crea) VALUES (?, ?, ?, 2, ?)`,
      [anticipoId, usuario_id, montoSolicitado, now]
    );
    
    const adminWhatsApp = process.env.ADMIN_WHATSAPP_NUMBER?.replace('whatsapp:', '') || '59172419112';
    const mensaje = buildAnticipoRequestMessage({
      nombreCompleto,
      usuarioNick: usuario.nick,
      montoSolicitado,
      motivo,
      montoAsistencia,
      montoComision,
      montoPropina,
      montoMaximo,
      anticipoId,
      fecha: new Date(),
    });

    await enviarWhatsApp(adminWhatsApp, mensaje);
    
    sendNotificationToAll('new_anticipo_request', {
      id: anticipoId,
      monto: montoSolicitado,
      empleado: nombreCompleto,
      nick: usuario.nick
    });
    
    return res.status(201).json({
      success: true,
      message: "Solicitud enviada.",
      anticipo_id: anticipoId
    });
    
  } catch (error) {
    console.error("Error en manejarSolicitudAnticipo:", error);
    return res.status(500).json({ success: false, message: "Error interno" });
  }
}
