import { NextApiRequest, NextApiResponse } from "next";
import { query, rawQuery } from "@/lib/db";

/**
 * @swagger
 * /api/tips:
 *   post:
 *     summary: Registrar tip
 *     description: Registra una nueva propina y la distribuye entre usuarios logueados
 *     tags: [Tips]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - venta_id
 *               - monto
 *             properties:
 *               venta_id:
 *                 type: integer
 *                 example: 123
 *                 description: ID de la venta
 *               monto:
 *                 type: number
 *                 example: 5000
 *                 description: Monto de la propina
 *     responses:
 *       201:
 *         description: Tip registrado exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Propina registrada y distribuida correctamente"
 *                 data:
 *                   type: object
 *                   properties:
 *                     propina_id:
 *                       type: integer
 *                     venta_id:
 *                       type: integer
 *                     monto_total:
 *                       type: number
 *                     usuarios_distribucion:
 *                       type: integer
 *                     monto_por_usuario:
 *                       type: number
 *       400:
 *         description: Datos inválidos
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Error del servidor
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *   get:
 *     summary: Obtener tips
 *     description: Obtiene propinas según el tipo solicitado (resumen, detalle)
 *     tags: [Tips]
 *     parameters:
 *       - in: query
 *         name: tipo
 *         schema:
 *           type: string
 *           enum: [resumen, detalle]
 *         description: Tipo de datos a obtener
 *       - in: query
 *         name: usuario_id
 *         schema:
 *           type: integer
 *         description: ID del usuario (requerido para detalle)
 *     responses:
 *       200:
 *         description: Datos obtenidos exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Propina'
 *       400:
 *         description: Parámetros inválidos
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Error del servidor
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { method, query: queryParams } = req;

  if (method === "POST") {
    // REGISTRAR PROPINA
    try {
      const { venta_id, monto } = req.body;

      console.log("=== REGISTRO DE PROPINA ===");
      console.log("venta_id:", venta_id);
      console.log("monto:", monto);

      if (!venta_id || !monto || monto <= 0) {
        return res.status(400).json({
          success: false,
          message: "Venta ID y monto de propina son requeridos",
        });
      }

      // Obtener solo cajeros y garzones logueados
      const usuariosLogueados = await query(`
      SELECT DISTINCT u.id_usuario, u.nombre, u.apellido
        FROM logins l
        INNER JOIN usuarios u ON u.id_usuario = l.usuario_id
        INNER JOIN roles r ON r.id_rol = u.rol_id
        WHERE l.estado = 1 AND u.estado = 1  
        AND r.nombre IN ('cajero', 'garzon')
      `) as any[];

      console.log("usuariosLogueados:", usuariosLogueados);

      if (!usuariosLogueados || usuariosLogueados.length === 0) {
        return res.status(400).json({
          success: false,
          message:
            "No hay usuarios logueados disponibles para distribuir la propina",
        });
      }

      // Calcular el monto por usuario
      const montoPorUsuario = monto / usuariosLogueados.length;
      console.log("montoPorUsuario:", montoPorUsuario);

      // Iniciar transacción
      await rawQuery("START TRANSACTION");

      try {
        // Insertar la propina principal
        console.log("Insertando propina principal...");
        const resultPropina: any = await query(
          "INSERT INTO propinas (venta_id, propina) VALUES (?, ?)",
          [venta_id, monto]
        );

        const propinaId = resultPropina.insertId;
        console.log("propinaId:", propinaId);

        // Insertar detalles de distribución para cada usuario
        console.log("Insertando detalles de propina...");
        for (const usuario of usuariosLogueados) {
          console.log("Insertando para usuario:", usuario);
          await query(
            "INSERT INTO detalle_propinas (propina_id, usuario_id, monto) VALUES (?, ?, ?)",
            [propinaId, usuario.id_usuario, montoPorUsuario]
          );
        }

        await rawQuery("COMMIT");
        console.log("Transacción completada exitosamente");

        return res.status(201).json({
          success: true,
          message: "Propina registrada y distribuida correctamente",
          data: {
            propina_id: propinaId,
            venta_id,
            monto_total: monto,
            usuarios_distribucion: usuariosLogueados.length,
            monto_por_usuario: montoPorUsuario,
            usuarios: usuariosLogueados,
          },
        });
      } catch (error) {
        console.error("=== ERROR EN TRANSACCIÓN ===");
        console.error("Error en transacción:", error);
        console.error("Haciendo ROLLBACK...");
        await rawQuery("ROLLBACK");
        console.error("ROLLBACK completado");
        throw error;
      }
    } catch (error) {
      console.error("=== ERROR DETALLADO ===");
      console.error("Error completo:", error);
      console.error("Tipo de error:", typeof error);
      console.error(
        "Mensaje:",
        error instanceof Error ? error.message : String(error)
      );
      console.error(
        "Stack:",
        error instanceof Error ? error.stack : "No stack disponible"
      );
      console.error("========================");

      return res.status(500).json({
        success: false,
        message: "Error al registrar la propina",
        error: error instanceof Error ? error.message : String(error),
      });
    }
  } else if (method === "GET") {
    // OBTENER PROPINAS
    try {
      const { tipo, usuario_id } = queryParams;

      if (!tipo) {
        return res.status(400).json({
          success: false,
          message: "El parámetro 'tipo' es requerido (resumen o detalle)"
        });
      }

      if (tipo === "resumen") {
        // OBTENER RESUMEN DE PROPINAS
        const propinasResumen = await query(`
          SELECT 
            U.id_usuario, 
            U.nombre, 
            U.apellido, 
            MAX(DP.fecha_crea) AS fecha_crea,
            SUM(CASE 
                WHEN P.estado = 1 THEN DP.monto 
                ELSE 0 
            END) AS total
          FROM propinas P 
          INNER JOIN detalle_propinas DP ON DP.propina_id = P.id_propina
          INNER JOIN usuarios U ON U.id_usuario = DP.usuario_id
          GROUP BY 
            U.id_usuario, 
            U.nombre, 
            U.apellido
          ORDER BY total DESC
        `) as any[];

        return res.status(200).json({
          success: true,
          data: propinasResumen
        });

      } else if (tipo === "detalle") {
        // OBTENER DETALLE DE PROPINAS
        if (!usuario_id) {
          return res.status(400).json({
            success: false,
            message: "usuario_id es requerido para obtener detalle"
          });
        }

        const propinasDetalle = await query(`
          SELECT 
            P.fecha_crea AS fecha_hora,
            V.codigo AS codigo_venta,
            DP.monto,
            CASE 
              WHEN P.estado = 1 THEN NULL
              ELSE P.fecha_crea
            END AS fecha_pago,
            CASE 
              WHEN P.estado = 1 THEN 'Por pagar'
              ELSE 'Pagado'
            END AS estado
          FROM propinas P 
          INNER JOIN detalle_propinas DP ON DP.propina_id = P.id_propina
          INNER JOIN ventas V ON V.id_venta = P.venta_id
          WHERE DP.usuario_id = ?
          ORDER BY P.fecha_crea DESC
        `, [usuario_id]) as any[];

        return res.status(200).json({
          success: true,
          data: propinasDetalle
        });

      } else {
        return res.status(400).json({
          success: false,
          message: "Tipo inválido. Use 'resumen' o 'detalle'"
        });
      }

    } catch (error) {
      console.error("Error al obtener propinas:", error);
      return res.status(500).json({
        success: false,
        message: "Error al obtener propinas",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  } else {
    return res.status(405).json({
      success: false,
      message: `Método ${method} no permitido`,
    });
  }
}
