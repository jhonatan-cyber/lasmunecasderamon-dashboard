import { NextApiRequest, NextApiResponse } from "next";
import { query } from "@/lib/db";
import { sendNotificationToAll } from "../notifications/sse";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query;
  const ventaId = parseInt(id as string);

  if (isNaN(ventaId)) {
    return res.status(400).json({ error: "ID de venta inválido" });
  }

  if (req.method === "GET") {
    try {
      // Obtener venta con detalles
      const ventaSql = `
         SELECT 
           v.*,
           COALESCE(CONCAT(c.nombre, " ", c.apellido), 'Sin cliente registrado') as cliente_nombre,
           h.nombre as habitacion_numero,
           CASE 
             WHEN v.pedido_id IS NOT NULL THEN CONCAT(g.nombre, " ", g.apellido)
             ELSE NULL
           END as garzon_nombre,
           CASE 
             WHEN v.pedido_id IS NOT NULL THEN g.nick
             ELSE NULL
           END as garzon_nick
         FROM ventas v
         LEFT JOIN clientes c ON v.cliente_id = c.id_cliente
         LEFT JOIN habitaciones h ON v.habitacion_id = h.id_habitacion
         LEFT JOIN pedidos p ON v.pedido_id = p.id_pedido
         LEFT JOIN usuarios g ON p.mesero_id = g.id_usuario
         WHERE v.id_venta = ?
       `;

      const ventas = await query(ventaSql, [ventaId]) as any[];
      if (ventas.length === 0) {
        return res.status(404).json({ error: "Venta no encontrada" });
      }

      const venta = ventas[0] as any;

      // Obtener detalles
      const detallesSql = `
         SELECT 
           dv.*,
           p.nombre as producto_nombre,
           p.precio as producto_precio
         FROM detalle_ventas dv
         LEFT JOIN productos p ON dv.producto_id = p.id_producto
         WHERE dv.venta_id = ?
       `;

      const detalles = await query(detallesSql, [ventaId]) as any[];

      // Obtener usuarios
      const usuariosSql = `
         SELECT 
           vu.*,
           u.nick,
           CONCAT(u.nombre," ",u.apellido) as usuario_nombre
         FROM ventas_usuarios vu
         LEFT JOIN usuarios u ON vu.usuario_id = u.id_usuario
         WHERE vu.venta_id = ?
       `;

      const usuarios = await query(usuariosSql, [ventaId]) as any[];
      const usuariosNombres = usuarios.map((u: any) => u.usuario_nombre).filter(Boolean);

      const ventaCompleta = {
        ...venta,
        id: venta.id_venta || venta.id, // Asegurar que siempre use 'id'
        detalles,
        usuarios,
        usuarios_nombres: usuariosNombres
      };

      return res.status(200).json(ventaCompleta);
    } catch (error) {

      return res.status(500).json({ error: "Error interno del servidor" });
    }
  }

  if (req.method === "PUT") {
    try {
      const { estado } = req.body;

      // Validar que la venta existe
      const ventaExistente = await query(
        "SELECT * FROM ventas WHERE id_venta = ?",
        [ventaId]
      ) as any[];

      if (ventaExistente.length === 0) {
        return res.status(404).json({ error: "Venta no encontrada" });
      }

      // Construir query de actualización
      let updateSql = "UPDATE ventas SET";
      const updateParams: any[] = [];

      if (estado !== undefined) {
        updateSql += " estado = ?,";
        updateParams.push(estado);
      }

      // Si se cancela o devuelve la venta, agregar fecha_mod
      if (estado === 'cancelada' || estado === 'devuelta') {
        updateSql += " fecha_mod = NOW(),";
      }

      updateSql = updateSql.slice(0, -1); // Remover la última coma
      updateSql += " WHERE id_venta = ?";
      updateParams.push(ventaId);

      await query(updateSql, updateParams);

      // Si el estado cambió a 1 (Completado/Finalizado) y antes era 2 (En proceso), liberar recursos
      if (estado === 1 && ventaExistente[0].estado === 2) {
        const venta = ventaExistente[0];

        // 1. Liberar habitación
        if (venta.habitacion_id) {
          const roomInfo = (await query('SELECT precio, comision_anfitriona, tiempo FROM habitaciones WHERE id_habitacion = ?', [venta.habitacion_id])) as any[];
          if (roomInfo.length > 0) {
            const room = roomInfo[0];
            const isFreeRoom = !Number(room.precio) && !Number(room.comision_anfitriona) && !Number(room.tiempo);
            if (!isFreeRoom) {
              await query('UPDATE habitaciones SET estado = 1 WHERE id_habitacion = ?', [venta.habitacion_id]);
            }
          }
        }

        // 2. Liberar anfitrionas asociadas
        const anfitrionas = (await query(
          `SELECT vu.usuario_id, r.nombre as rol 
           FROM ventas_usuarios vu
           INNER JOIN usuarios u ON vu.usuario_id = u.id_usuario
           LEFT JOIN roles r ON u.rol_id = r.id_rol
           WHERE vu.venta_id = ?`,
          [ventaId]
        )) as any[];

        if (anfitrionas.length > 0) {
          for (const anfitriona of anfitrionas) {
            if (anfitriona.rol === 'anfitriona') {
              await query('UPDATE usuarios SET estado_servicio = 1 WHERE id_usuario = ?', [anfitriona.usuario_id]);
            }
          }
        }

        // 3. Notificar cese de temporizador
        sendNotificationToAll('timer_stopped', {
          servicioId: ventaId,
          roomId: venta.habitacion_id,
          tipoTransaccion: 'venta'
        });
      }

      // Obtener la venta actualizada
      const ventaActualizada = await query(`
         SELECT 
           v.*,
           COALESCE(CONCAT(c.nombre, " ", c.apellido), 'Sin cliente registrado') as cliente_nombre,
           h.nombre as habitacion_numero,
           CASE 
             WHEN v.pedido_id IS NOT NULL THEN CONCAT(g.nombre, " ", g.apellido)
             ELSE NULL
           END as garzon_nombre,
           CASE 
             WHEN v.pedido_id IS NOT NULL THEN g.nick
             ELSE NULL
           END as garzon_nick
         FROM ventas v
         LEFT JOIN clientes c ON v.cliente_id = c.id_cliente
         LEFT JOIN habitaciones h ON v.habitacion_id = h.id_habitacion
         LEFT JOIN pedidos p ON v.pedido_id = p.id_pedido
         LEFT JOIN usuarios g ON p.mesero_id = g.id_usuario
         WHERE v.id_venta = ?
       `, [ventaId]) as any[];

      return res.status(200).json(ventaActualizada[0] as any);
    } catch (error) {

      return res.status(500).json({ error: "Error interno del servidor" });
    }
  }

  if (req.method === "DELETE") {
    try {
      // Obtener información de la venta antes de eliminar
      const venta = await query(
        "SELECT * FROM ventas WHERE id_venta = ?",
        [ventaId]
      ) as any[];

      if (venta.length === 0) {
        return res.status(404).json({ error: "Venta no encontrada" });
      }

      // Eliminar detalles primero
      await query("DELETE FROM detalle_ventas WHERE venta_id = ?", [ventaId]);

      // Eliminar usuarios de la venta
      await query("DELETE FROM ventas_usuarios WHERE venta_id = ?", [ventaId]);

      // Eliminar venta
      await query("DELETE FROM ventas WHERE id_venta = ?", [ventaId]);

      return res.status(200).json({ message: "Venta eliminada correctamente" });
    } catch (error) {

      return res.status(500).json({ error: "Error interno del servidor" });
    }
  }

  return res.status(405).json({ error: "Método no permitido" });
} 