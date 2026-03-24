/* eslint-disable */
import type { NextApiRequest, NextApiResponse } from "next";
import { query } from "@/lib/db";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { id } = req.query;
  if (!id) {
    return res.status(400).json({
      success: false,
      message: "Falta el id"
    });
  }

  if (req.method === "GET") {
    try {
      const results = await query(
        "SELECT * FROM habitaciones WHERE id_habitacion = ?",
        [id]
      );

      if (Array.isArray(results) && results.length > 0) {
        const room = results[0] as any;
        return res.status(200).json({
          success: true,
          data: {
            id: room.id_habitacion,
            name: room.nombre,
            price: room.precio,
            time: room.tiempo,
            status: room.estado,
            fecha_crea: room.fecha_crea,
            fecha_mod: room.fecha_mod,
            fecha_elim: room.fecha_elim,
            comision_anfitriona: room.comision_anfitriona ?? null,
          }
        });
      } else {
        return res.status(404).json({
          success: false,
          message: "Habitación no encontrada"
        });
      }
    } catch (error) {

      return res.status(500).json({
        success: false,
        message: "Error al obtener habitación",
        error,
      });
    }
  } else if (req.method === "PATCH") {
    try {
      const { action, price, time, comision_anfitriona } = req.body;

      // Handle status changes
      if (action) {
        let newStatus;
        if (action === "activate") newStatus = 1;
        else if (action === "deactivate") newStatus = 0;
        else if (action === "occupy") {
          const roomInfo = (await query('SELECT precio, comision_anfitriona, tiempo FROM habitaciones WHERE id_habitacion = ?', [id])) as any[];
          if (roomInfo.length > 0) {
            const room = roomInfo[0];
            const isFreeRoom = !Number(room.precio) && !Number(room.comision_anfitriona) && !Number(room.tiempo);
            if (isFreeRoom) {
              return res.status(200).json({
                success: true,
                message: "Ignorado por ser área libre"
              });
            }
          }
          newStatus = 2;
        }
        else {
          return res.status(400).json({
            success: false,
            message: "Acción no válida"
          });
        }

        await query(
          "UPDATE habitaciones SET estado = ? WHERE id_habitacion = ?",
          [newStatus, id]
        );

        return res.status(200).json({
          success: true,
          message: "Habitación actualizada correctamente"
        });
      }

      // Handle individual property updates
      if (price !== undefined) {
        await query(
          "UPDATE habitaciones SET precio = ? WHERE id_habitacion = ?",
          [price, id]
        );
        return res.status(200).json({
          success: true,
          message: "Precio actualizado correctamente"
        });
      }

      if (time !== undefined) {
        await query(
          "UPDATE habitaciones SET tiempo = ? WHERE id_habitacion = ?",
          [time, id]
        );
        return res.status(200).json({
          success: true,
          message: "Tiempo actualizado correctamente"
        });
      }

      if (comision_anfitriona !== undefined) {
        console.log('📝 [PATCH /api/rooms/[id]] Updating comision_anfitriona:', {
          comision_anfitriona,
          roomId: id,
          type: typeof comision_anfitriona
        });

        try {
          await query(
            "UPDATE habitaciones SET comision_anfitriona = ? WHERE id_habitacion = ?",
            [comision_anfitriona, id]
          );
          console.log('✅ [PATCH /api/rooms/[id]] Comisión actualizada exitosamente');
          return res.status(200).json({
            success: true,
            message: "Comisión actualizada correctamente"
          });
        } catch (updateError: any) {
          console.error('❌ [PATCH /api/rooms/[id]] Error actualizando comisión:', {
            message: updateError?.message,
            code: updateError?.code,
            sqlState: updateError?.sqlState,
            errno: updateError?.errno
          });
          return res.status(500).json({
            success: false,
            message: "Error al actualizar comisión de habitación",
            error: updateError?.message || 'Unknown error'
          });
        }
      }

      return res.status(400).json({
        success: false,
        message: "No se proporcionaron datos para actualizar"
      });

    } catch (error) {
      console.error('Error in PATCH /api/rooms/[id]:', error)
      return res.status(500).json({
        success: false,
        message: "Error al actualizar habitación",
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  } else {
    return res.status(405).json({
      success: false,
      message: `Método ${req.method} no permitido`
    });
  }
}
