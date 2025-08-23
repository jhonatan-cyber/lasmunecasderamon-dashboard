import type { NextApiRequest, NextApiResponse } from "next";
import { query } from "@/lib/db";
import { withTransaction } from "@/lib/transactionUtils";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === "POST") {
    if (req.method !== "POST") {
      return res.status(405).json({ success: false, message: "Método no permitido" });
    }

    const { usuario_id, monto } = req.body;
    if (!usuario_id || !monto || isNaN(Number(monto))) {
      return res.status(400).json({ success: false, message: "usuario_id y monto son requeridos" });
    }

    try {
      // 1. Obtener monto de asistencia
      const asistenciaResult = await query(
        `SELECT total_final FROM (
          SELECT U.id_usuario, (COALESCE(A.total_asistencias, 0) * U.sueldo)
            - (COALESCE(A.total_asistencias, 0) * U.aporte)
            - (COALESCE(U.semanas_con_descuento, 0) * U.descuento) AS total_final
          FROM (
            SELECT id_usuario, nombre, apellido, sueldo, aporte, descuento,
              COUNT(DISTINCT YEARWEEK(fecha, 1)) AS semanas_con_descuento
            FROM usuarios
            LEFT JOIN asistencias ON usuarios.id_usuario = asistencias.usuario_id AND asistencias.estado = 1
            GROUP BY id_usuario
          ) U
          LEFT JOIN (
            SELECT usuario_id, COUNT(*) AS total_asistencias
            FROM asistencias WHERE estado = 1 GROUP BY usuario_id
          ) A ON U.id_usuario = A.usuario_id
        ) X WHERE id_usuario = ?`,
        [usuario_id]
      ) as any[];
      const asistencia = asistenciaResult[0];
      const montoAsistencia = Number(asistencia?.total_final || 0);

      // 2. Obtener monto de comisiones (pendientes)
      const comisionesResult = await query(
        `SELECT COALESCE(SUM(DC.comision),0) AS total
         FROM detalle_comisiones DC
         INNER JOIN comisiones C ON C.id_comision = DC.comision_id
         WHERE DC.usuario_id = ? AND C.estado = 1`,
        [usuario_id]
      ) as any[];
      const comisiones = comisionesResult[0];
      const montoComision = Number(comisiones?.total || 0);

      // 3. Obtener monto de propinas (por pagar)
      const propinasResult = await query(
        `SELECT COALESCE(SUM(DP.monto),0) AS total
         FROM detalle_propinas DP
         INNER JOIN propinas P ON P.id_propina = DP.propina_id
         WHERE DP.usuario_id = ? AND P.estado = 1`,
        [usuario_id]
      ) as any[];
      const propinas = propinasResult[0];
      const montoPropina = Number(propinas?.total || 0);

      const montoSolicitado = Number(monto);
      let maximo = 0;
      let otorgar = false;

      // 1. Solo asistencia
      if (montoSolicitado <= montoAsistencia) {
        otorgar = true;
      } else if (montoSolicitado <= montoComision) {
        // 2. Solo comisiones
        otorgar = true;
      } else if (montoSolicitado <= montoAsistencia + montoComision) {
        // 3. Suma asistencia + comisiones
        otorgar = true;
      } else if (montoSolicitado <= montoPropina) {
        // 4. Solo propinas
        otorgar = true;
      } else if (montoSolicitado <= montoAsistencia + montoComision + montoPropina) {
        // 5. Suma total
        otorgar = true;
      } else {
        // 6. No se puede otorgar, calcular máximo
        maximo = montoAsistencia + montoComision + montoPropina;
      }

      if (otorgar) {
        try {
          const result = await withTransaction(async (trx) => {
            // 1. Insertar el anticipo
            await trx(
              "INSERT INTO anticipos (usuario_id, monto) VALUES (?, ?)",
              [usuario_id, montoSolicitado]
            );

            // 2. Obtener la caja abierta actual
            const cajaResult = await trx(`
              SELECT id_caja, efectivo, anticipo 
              FROM cajas 
              WHERE estado = 1 
              ORDER BY fecha_apertura DESC 
              LIMIT 1
            `) as any[];
            const cajaActual = cajaResult[0];

            if (!cajaActual) {
              throw new Error("No hay una caja abierta para procesar el anticipo");
            }

            // 3. Verificar que hay suficiente efectivo
            const efectivoDisponible = cajaActual.efectivo || 0;
            if (efectivoDisponible < montoSolicitado) {
              throw new Error(`No hay suficiente efectivo en caja. Disponible: $${efectivoDisponible}, Solicitado: $${montoSolicitado}`);
            }

            // 4. Actualizar la caja: restar del efectivo y sumar al anticipo
            const nuevoEfectivo = efectivoDisponible - montoSolicitado;
            const nuevoAnticipo = (cajaActual.anticipo || 0) + montoSolicitado;

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
          console.error("Error en transacción de anticipo:", error);
          return res.status(400).json({ 
            success: false, 
            message: error instanceof Error ? error.message : "Error al procesar el anticipo" 
          });
        }
      } else {
        return res.status(400).json({
          success: false,
          message: `No se puede otorgar el anticipo solicitado. El monto máximo disponible es $${maximo}`,
          maximo,
        });
      }
    } catch (error) {
      console.error("Error al procesar anticipo:", error);
      return res.status(500).json({ success: false, message: "Error interno del servidor" });
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