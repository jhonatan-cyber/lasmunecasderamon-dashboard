import { NextApiRequest, NextApiResponse } from "next";
import { query } from "@/lib/db";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Método no permitido" });
  }

  try {
    const { Body, From } = req.body;

    // Verificar que es un mensaje de WhatsApp
    if (!Body || !From) {
      return res.status(400).json({ error: "Datos incompletos" });
    }

    const mensaje = Body.toLowerCase().trim();
    const numeroRemitente = From.replace('whatsapp:', '');

    // Verificar que el mensaje viene del administrador
    const adminWhatsApp = process.env.ADMIN_WHATSAPP_NUMBER?.replace('whatsapp:', '') || "59172419112";
    
    if (numeroRemitente !== adminWhatsApp) {
      console.log(`Mensaje de número no autorizado: ${numeroRemitente}`);
      return res.status(200).json({ message: "No autorizado" });
    }

    // Buscar ventas pendientes de anulación
    const ventasPendientesSql = `
      SELECT 
        v.id_venta,
        v.codigo,
        v.total,
        CONCAT(c.nombre, " ", c.apellido) as cliente_nombre,
        v.fecha_mod
      FROM ventas v
      LEFT JOIN clientes c ON v.cliente_id = c.id_cliente
      WHERE v.estado = 2
      ORDER BY v.fecha_mod DESC
    `;

    const ventasPendientes = await query(ventasPendientesSql);
    
    // Buscar servicios pendientes de devolución
    const serviciosPendientesSql = `
      SELECT 
        s.id_servicio,
        s.codigo,
        s.total,
        c.nombre as cliente_nombre,
        s.fecha_mod
      FROM servicios s
      LEFT JOIN clientes c ON s.cliente_id = c.id_cliente
      WHERE s.estado = 2
      ORDER BY s.fecha_mod DESC
    `;

    const serviciosPendientes = await query(serviciosPendientesSql);
    
    // Combinar todas las solicitudes pendientes
    const todasLasSolicitudes = [
      ...ventasPendientes.map((v: any) => ({ ...v, tipo: 'venta' })),
      ...serviciosPendientes.map((s: any) => ({ ...s, tipo: 'servicio' }))
    ].sort((a: any, b: any) => new Date(b.fecha_mod).getTime() - new Date(a.fecha_mod).getTime());
    
    if (todasLasSolicitudes.length === 0) {
      console.log("No hay solicitudes pendientes");
      return res.status(200).json({ message: "No hay solicitudes pendientes" });
    }

    // Si hay múltiples solicitudes pendientes, mostrar lista
    if (todasLasSolicitudes.length > 1) {
      const listaSolicitudes = todasLasSolicitudes.map((s: any, index: number) => 
        `${index + 1}. ${s.tipo === 'venta' ? 'VENTA' : 'SERVICIO'} ${s.codigo} - ${s.cliente_nombre} - $${s.total?.toLocaleString() || 0}`
      ).join('\n');

      const mensajeLista = `📋 *MÚLTIPLES SOLICITUDES PENDIENTES*

${listaSolicitudes}

*Para responder, especifica el número:*
• "1 SI" o "1 CONFIRMAR" - Para confirmar la primera
• "2 NO" o "2 RECHAZAR" - Para rechazar la segunda
• etc.

*O responde solo "SI"/"NO" para la más reciente*`;

      console.log("Múltiples solicitudes pendientes:", mensajeLista);
      return res.status(200).json({ message: "Múltiples solicitudes pendientes" });
    }

    const solicitudPendiente = todasLasSolicitudes[0] as any;

    // Procesar respuesta
    const procesarSolicitud = async (solicitud: any, accion: 'confirmar' | 'rechazar') => {
      const nuevoEstado = accion === 'confirmar' ? 
        (solicitud.tipo === 'venta' ? 0 : 3) : // 0 = anulada, 3 = devuelto
        (solicitud.tipo === 'venta' ? 1 : 1);   // 1 = activa/activo
      const estadoTexto = accion === 'confirmar' ? 
        (solicitud.tipo === 'venta' ? 'anulada' : 'devuelto') : 
        (solicitud.tipo === 'venta' ? 'activa' : 'activo');
      const emoji = accion === 'confirmar' ? '✅' : '❌';
      const titulo = accion === 'confirmar' ? 
        (solicitud.tipo === 'venta' ? 'ANULACIÓN CONFIRMADA' : 'DEVOLUCIÓN CONFIRMADA') : 
        (solicitud.tipo === 'venta' ? 'ANULACIÓN RECHAZADA' : 'DEVOLUCIÓN RECHAZADA');

      if (solicitud.tipo === 'venta') {
        await query(
          "UPDATE ventas SET estado = ?, fecha_mod = NOW() WHERE id_venta = ?",
          [nuevoEstado, solicitud.id_venta]
        );
      } else {
        await query(
          "UPDATE servicios SET estado = ?, fecha_mod = NOW() WHERE id_servicio = ?",
          [nuevoEstado, solicitud.id_servicio]
        );

        // Si se confirma la devolución de servicio, realizar operaciones adicionales
        if (accion === 'confirmar') {
          // 1. Cambiar estado de la habitación de 2 (ocupada) a 1 (disponible)
          await query(
            "UPDATE habitaciones SET estado = 1 WHERE id_habitacion = (SELECT habitacion_id FROM servicios WHERE id_servicio = ?)",
            [solicitud.id_servicio]
          );

          // 2. Actualizar caja activa
          const cajaActiva = await query(
            "SELECT * FROM cajas WHERE estado = 1 ORDER BY fecha_apertura DESC LIMIT 1"
          ) as any[];

          if (cajaActiva && cajaActiva.length > 0) {
            const caja = cajaActiva[0];
            
            // Obtener información del servicio
            const servicioInfo = await query(
              "SELECT total, iva FROM servicios WHERE id_servicio = ?",
              [solicitud.id_servicio]
            ) as any[];

            if (servicioInfo && servicioInfo.length > 0) {
              const servicio = servicioInfo[0];
              const totalServicio = servicio.total || 0;
              const ivaServicio = servicio.iva || 0;

              // Calcular nuevos valores de caja
              const nuevoEfectivo = Math.max(0, caja.efectivo - totalServicio);
              const nuevaIva = Math.max(0, caja.iva - ivaServicio);
              const nuevaDevoluciones = caja.devoluciones + totalServicio;

              // Actualizar caja
              await query(
                `UPDATE cajas 
                 SET efectivo = ?, iva = ?, devoluciones = ?
                 WHERE id_caja = ?`,
                [nuevoEfectivo, nuevaIva, nuevaDevoluciones, caja.id_caja]
              );
            }
          }
        }
      }

      console.log(`${emoji} ${solicitud.tipo === 'venta' ? 'Anulación' : 'Devolución'} ${accion === 'confirmar' ? 'confirmada' : 'rechazada'} para ${solicitud.tipo} ${solicitud.codigo}`);
      
      const mensajeRespuesta = `${emoji} *${titulo}*

📋 *${solicitud.tipo === 'venta' ? 'Venta' : 'Servicio'} ${estadoTexto}:*
• Código: ${solicitud.codigo}
• Cliente: ${solicitud.cliente_nombre}
• Total: $${solicitud.total?.toLocaleString() || 0}

${accion === 'confirmar' ? 
  (solicitud.tipo === 'venta' ? 
    '_La venta ha sido anulada exitosamente._' : 
    '_El servicio ha sido devuelto exitosamente. Habitación liberada y caja actualizada._'
  ) : 
  (solicitud.tipo === 'venta' ? 
    '_La venta ha sido mantenida activa._' : 
    '_El servicio ha sido mantenido activo. Temporizador reanudado._'
  )}`;

      console.log("Mensaje de respuesta:", mensajeRespuesta);
    };

    // Verificar si es una respuesta específica (ej: "1 SI", "2 NO")
    const respuestaEspecifica = mensaje.match(/^(\d+)\s+(si|no|confirmar|rechazar|confirmo|rechazo)$/i);
    
    if (respuestaEspecifica) {
      const numeroSolicitud = parseInt(respuestaEspecifica[1]) - 1; // Convertir a índice
      const accion = respuestaEspecifica[2].toLowerCase();
      
      if (numeroSolicitud >= 0 && numeroSolicitud < todasLasSolicitudes.length) {
        const solicitudSeleccionada = todasLasSolicitudes[numeroSolicitud] as any;
        const esConfirmacion = accion === 'si' || accion === 'confirmar' || accion === 'confirmo';
        
        await procesarSolicitud(solicitudSeleccionada, esConfirmacion ? 'confirmar' : 'rechazar');
      } else {
        console.log(`Número de solicitud inválido: ${numeroSolicitud + 1}`);
        return res.status(200).json({ message: "Número de solicitud inválido" });
      }
    } else if (mensaje === "si" || mensaje === "confirmar" || mensaje === "confirmo") {
      // Confirmar solicitud más reciente
      await procesarSolicitud(solicitudPendiente, 'confirmar');
    } else if (mensaje === "no" || mensaje === "rechazar" || mensaje === "rechazo") {
      // Rechazar solicitud más reciente
      await procesarSolicitud(solicitudPendiente, 'rechazar');
    } else {
      console.log(`Mensaje no reconocido: ${mensaje}`);
      return res.status(200).json({ message: "Mensaje no reconocido" });
    }

    return res.status(200).json({ message: "Procesado correctamente" });

  } catch (error) {
    console.error("Error en webhook WhatsApp:", error);
    return res.status(500).json({ error: "Error interno del servidor" });
  }
} 