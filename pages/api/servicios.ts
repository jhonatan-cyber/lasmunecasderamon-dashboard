import { NextApiRequest, NextApiResponse } from "next";
import { query } from "@/lib/db";
import { withTransaction } from "@/lib/transactionUtils";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method === "GET") {
    try {
      const { all } = req.query;
      let whereClause = '';
      
      if (all === 'true') {
        // Mostrar servicios no activos (estado != 1)
        whereClause = 'WHERE s.estado != 1';
      } else if (all === 'false') {
        // Mostrar solo servicios activos (estado = 1)
        whereClause = 'WHERE s.estado = 1';
      }
      // Si no se especifica 'all', mostrar todos los servicios sin filtro
      
      const servicios = await query(`
        SELECT 
          s.id_servicio,
          s.codigo,
          s.cliente_id,
          s.habitacion_id,
          s.precio_habitacion,
          s.precio_servicio,
          s.iva,
          s.sub_total,
          s.total,
          s.tiempo,
          s.metodo_pago,
          s.fecha_crea,
          s.estado,
          CONCAT(c.nombre, ' ', c.apellido) as cliente_nombre,
          h.nombre as habitacion_numero,
          COUNT(DISTINCT ds.usuario_id) as total_usuarios,
          GROUP_CONCAT(DISTINCT u.nick SEPARATOR ', ') as anfitrionas_nombres
        FROM servicios s
        LEFT JOIN clientes c ON c.id_cliente = s.cliente_id
        LEFT JOIN habitaciones h ON h.id_habitacion = s.habitacion_id
        LEFT JOIN detalle_servicios ds ON ds.servicio_id = s.id_servicio
        LEFT JOIN usuarios u ON u.id_usuario = ds.usuario_id
        ${whereClause}
        GROUP BY s.id_servicio
        ORDER BY s.fecha_crea DESC
      `);

      // Log para debug
      if (process.env.NODE_ENV === 'development') {
        console.log('Servicios devueltos:', (servicios as any[]).map((s: any) => ({
          id: s.id_servicio,
          codigo: s.codigo,
          estado: s.estado,
          estado_tipo: typeof s.estado
        })));
      }

      return res.status(200).json({
        success: true,
        data: servicios,
      });
    } catch (error) {
      console.error("Error al obtener servicios:", error);
      return res.status(500).json({
        success: false,
        message: "Error al obtener servicios",
      });
    }
  } else if (req.method === "POST") {
    try {
      const {
        cliente_id,
        habitacion_id,
        precio_habitacion,
        precio_servicio,
        iva,
        sub_total,
        total,
        tiempo,
        metodo_pago,
        usuarios,
      } = req.body;

      // Validaciones
      if (!cliente_id || !precio_servicio || !tiempo) {
        return res.status(400).json({
          success: false,
          message: "Cliente, precio de servicio y tiempo son requeridos",
        });
      }

             // Generar código único
       const codigo = generateUniqueCode();

       let cajaActualizada = false;

              // Crear servicio usando transacción
        const result = await withTransaction(async (connection) => {
         // Insertar servicio
         const servicioResult: any = await query(
           `INSERT INTO servicios (
             codigo, cliente_id, habitacion_id, precio_habitacion, 
             precio_servicio, iva, sub_total, total, tiempo, metodo_pago
           ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
           [
             codigo,
             cliente_id,
             habitacion_id,
             precio_habitacion || 0,
             precio_servicio,
             iva || 0,
             sub_total,
             total,
             tiempo,
             metodo_pago || null,
           ]
         );

         const servicioId = servicioResult.insertId;

         // Actualizar estado de la habitación a ocupada (estado = 2)
         await query(
           "UPDATE habitaciones SET estado = 2 WHERE id_habitacion = ?",
           [habitacion_id]
         );

                      // Insertar detalles de servicio (usuarios)
             if (usuarios && Array.isArray(usuarios) && usuarios.length > 0) {
               for (const usuarioId of usuarios) {
                 await query(
                   "INSERT INTO detalle_servicios (usuario_id, servicio_id) VALUES (?, ?)",
                   [usuarioId, servicioId]
                 );
               }
             }

                           // Registrar comisiones para cada anfitriona
              if (usuarios && Array.isArray(usuarios) && usuarios.length > 0) {
                // Calcular comisión por anfitriona (dividir el precio del servicio entre las anfitrionas)
                const comisionPorAnfitriona = Math.floor(precio_servicio / usuarios.length);
                
                for (const usuarioId of usuarios) {
                  // Crear comisión para cada anfitriona
                  const comisionResult: any = await query(
                    `INSERT INTO comisiones (
                      venta_id,
                      servicio_id,
                      monto
                    ) VALUES (?, ?, ?)`,
                    [
                      null, // venta_id es null para servicios
                      servicioId,
                      comisionPorAnfitriona
                    ]
                  );

                  const comisionId = comisionResult.insertId;

                  // Insertar detalle de comisión
                  await query(
                    `INSERT INTO detalle_comisiones (
                      comision_id,
                      usuario_id,
                      comision
                    ) VALUES (?, ?, ?)`,
                    [
                      comisionId,
                      usuarioId,
                      comisionPorAnfitriona
                    ]
                  );
                }
              }

              // Actualizar la caja activa
              const cajaActiva = await query(
                "SELECT id_caja FROM cajas WHERE estado = 1 LIMIT 1"
              ) as any[];

              if (cajaActiva && cajaActiva.length > 0) {
                const cajaId = cajaActiva[0].id_caja;
                
                // Calcular el monto según el método de pago
                let montoEfectivo = 0;
                let montoTarjeta = 0;
                let montoTransferencia = 0;
                
                switch (metodo_pago) {
                  case 'efectivo':
                    montoEfectivo = total;
                    break;
                  case 'tarjeta':
                    montoTarjeta = total;
                    break;
                  case 'transferencia':
                    montoTransferencia = total;
                    break;
                  default:
                    montoEfectivo = total; // Por defecto efectivo
                }

                // Actualizar la caja con los montos correspondientes
                await query(
                  `UPDATE cajas SET 
                    servicio = servicio + ?,
                    efectivo = efectivo + ?,
                    tarjeta = tarjeta + ?,
                    transferencia = transferencia + ?,
                    comision = comision + ?
                  WHERE id_caja = ?`,
                  [
                    total, // servicios
                    montoEfectivo,
                    montoTarjeta,
                    montoTransferencia,
                    usuarios ? Math.floor(precio_servicio / usuarios.length) * usuarios.length : 0, // comisión total
                    cajaId
                  ]
                );
                
                cajaActualizada = true;
              }

             return servicioId;
       });

             return res.status(201).json({
         success: true,
         message: "Servicio creado exitosamente",
         data: { 
           id_servicio: result,
           comisiones_creadas: usuarios ? usuarios.length : 0,
           comision_por_anfitriona: usuarios && usuarios.length > 0 ? Math.floor(precio_servicio / usuarios.length) : 0,
           caja_actualizada: cajaActualizada
         },
       });
    } catch (error) {
      console.error("Error al crear servicio:", error);
      return res.status(500).json({
        success: false,
        message: "Error al crear servicio",
      });
    }
  } else {
    return res.status(405).json({
      success: false,
      message: `Método ${req.method} no permitido`,
    });
  }
}

function generateUniqueCode(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let result = "";
  for (let i = 0; i < 8; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
} 