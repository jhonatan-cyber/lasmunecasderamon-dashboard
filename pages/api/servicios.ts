import { NextApiRequest, NextApiResponse } from 'next';
import { query } from '@/lib/db';
import { withTransaction } from '@/lib/transactionUtils';
import { withAuth, getCurrentUser } from '@/lib/middleware/auth';

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    try {
      const { all, caja_id } = req.query;
      let whereClause = '';
      const params: any[] = [];

      if (all === 'true') {
        // Mostrar servicios no activos (estado != 1)
        whereClause = 'WHERE s.estado != 1';
      } else if (all === 'false') {
        // Mostrar solo servicios activos (estado = 1)
        whereClause = 'WHERE s.estado = 1';
      }

      // Filtrar directamente por caja_id si se proporciona
      if (caja_id) {
        whereClause += whereClause ? ' AND s.caja_id = ?' : 'WHERE s.caja_id = ?';
        params.push(caja_id);
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
          s.created_by,
          COALESCE(GROUP_CONCAT(DISTINCT CONCAT(c_multi.nombre, ' ', c_multi.apellido) SEPARATOR ', '), COALESCE(CONCAT(c.nombre, ' ', c.apellido), 'Sin cliente registrado')) as cliente_nombre,
          h.nombre as habitacion_numero,
          COUNT(DISTINCT ds.usuario_id) as total_usuarios,
          GROUP_CONCAT(DISTINCT u.nick SEPARATOR ', ') as anfitrionas_nombres,
          CONCAT(creator.nombre, ' ', creator.apellido) as creator_name
        FROM servicios s
        LEFT JOIN clientes c ON c.id_cliente = s.cliente_id
        LEFT JOIN detalle_servicios_clientes dsc ON dsc.servicio_id = s.id_servicio
        LEFT JOIN clientes c_multi ON c_multi.id_cliente = dsc.cliente_id
        LEFT JOIN habitaciones h ON h.id_habitacion = s.habitacion_id
        LEFT JOIN detalle_servicios ds ON ds.servicio_id = s.id_servicio
        LEFT JOIN usuarios u ON u.id_usuario = ds.usuario_id
        LEFT JOIN usuarios creator ON creator.id_usuario = s.created_by
        ${whereClause}
        GROUP BY s.id_servicio
        ORDER BY s.fecha_crea DESC
      `, params);

      return res.status(200).json({
        success: true,
        data: servicios
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: 'Error al obtener servicios'
      });
    }
  } else if (req.method === 'POST') {
    try {
      // Get current user
      const currentUser = getCurrentUser(req);
      const createdBy = currentUser?.id || null;

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
        clientes: clientesArray
      } = req.body;

      // Validaciones
      if (precio_servicio === undefined || precio_servicio === null || !tiempo) {
        return res.status(400).json({
          success: false,
          message: 'Precio de servicio y tiempo son requeridos'
        });
      }

      // Usar 0 si precio_servicio no se proporciona o es vacío
      const precioServicioFinal = precio_servicio === '' ? 0 : precio_servicio;

      // Validar si el cliente existe antes de insertar, permitir NULL si no existe
      let clienteIdFinal = null;
      if (cliente_id) {
        const clienteExistsSql = 'SELECT id_cliente FROM clientes WHERE id_cliente = ? AND estado = 1';
        const clienteExistsResult = (await query(clienteExistsSql, [cliente_id])) as any[];

        if (clienteExistsResult && clienteExistsResult.length > 0) {
          clienteIdFinal = cliente_id;
          console.log('[SERVICIOS POST] Cliente validado:', clienteIdFinal);
        } else {
          console.warn('[SERVICIOS POST] Cliente no existe o está inactivo, se creará servicio sin cliente');
          clienteIdFinal = null;
        }
      } else {
        console.log('[SERVICIOS POST] No se proporcionó cliente_id, se creará servicio sin cliente');
        clienteIdFinal = null;
      }

      // Generar código único
      const codigo = generateUniqueCode();

      // Redondear el total a múltiplos de 5000 y sumar excedente al IVA solo si es tarjeta
      let totalFinal = total;
      let ivaFinal = iva || 0;

      if (metodo_pago === "tarjeta") {
        const totalRedondeado = Math.ceil(total / 5000) * 5000;
        const excedente = totalRedondeado - total;
        totalFinal = totalRedondeado;
        ivaFinal = (iva || 0) + excedente;
      }

      // Obtener la caja abierta actual
      const cajaAbiertaResult = (await query(
        'SELECT id_caja FROM cajas WHERE estado = 1 ORDER BY fecha_apertura DESC LIMIT 1'
      )) as any[];
      const cajaId = cajaAbiertaResult && cajaAbiertaResult.length > 0 ? cajaAbiertaResult[0].id_caja : null;

      let cajaActualizada = false;

      // Crear servicio usando transacción
      const result = await withTransaction(async connection => {
        let comisionTotalPorAnfitriona = 0;
        // Insertar servicio
        const servicioResult: any = await query(
          `INSERT INTO servicios (
             codigo, cliente_id, habitacion_id, precio_habitacion, 
             precio_servicio, iva, sub_total, total, tiempo, metodo_pago, caja_id, created_by
           ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            codigo,
            clienteIdFinal,
            habitacion_id,
            precio_habitacion || 0,
            precioServicioFinal,
            ivaFinal,
            sub_total,
            totalFinal,
            tiempo,
            metodo_pago || null,
            cajaId,
            createdBy
          ]
        );

        const servicioId = servicioResult.insertId;

        // Actualizar estado de la habitación a ocupada (estado = 2)
        await query('UPDATE habitaciones SET estado = 2 WHERE id_habitacion = ?', [habitacion_id]);

        // Insertar detalles de clientes (si hay múltiples)
        if (clientesArray && Array.isArray(clientesArray) && clientesArray.length > 0) {
          for (const cId of clientesArray) {
            await query('INSERT INTO detalle_servicios_clientes (servicio_id, cliente_id) VALUES (?, ?)', [
              servicioId,
              cId
            ]);
          }
        } else if (clienteIdFinal) {
          // Si no hay array pero hay uno principal, insertarlo también en detalle para consistencia
          await query('INSERT INTO detalle_servicios_clientes (servicio_id, cliente_id) VALUES (?, ?)', [
            servicioId,
            clienteIdFinal
          ]);
        }

        // Insertar detalles de servicio (usuarios)
        if (usuarios && Array.isArray(usuarios) && usuarios.length > 0) {
          for (const usuarioId of usuarios) {
            await query('INSERT INTO detalle_servicios (usuario_id, servicio_id) VALUES (?, ?)', [
              usuarioId,
              servicioId
            ]);
          }
        }

        // Registrar comisiones para cada anfitriona
        if (usuarios && Array.isArray(usuarios) && usuarios.length > 0) {
          // Obtener la comisión de la habitación (comision_anfitriona)
          let comisionHabitacion = 0;
          let tieneComision = false;
          if (habitacion_id) {
            const habitacionResult = (await query(
              'SELECT comision_anfitriona FROM habitaciones WHERE id_habitacion = ?',
              [habitacion_id]
            )) as any[];
            if (habitacionResult && habitacionResult.length > 0 && habitacionResult[0].comision_anfitriona) {
              comisionHabitacion = habitacionResult[0].comision_anfitriona;
              tieneComision = comisionHabitacion > 0;
              console.log('[SERVICIOS POST] Comisión de habitación encontrada:', comisionHabitacion);
            }
          }

          // El precio de servicio siempre se multiplica por el número de anfitrionas
          const nuevoPrecioServicio = (precioServicioFinal || 0) * usuarios.length;
          await query('UPDATE servicios SET precio_servicio = ? WHERE id_servicio = ?', [
            nuevoPrecioServicio,
            servicioId
          ]);

          if (tieneComision) {
            // Si la habitación tiene comisión:
            // - La comisión se divide entre el número de chicas
            // - El valor de la habitación NO se multiplica por el número de chicas
            // - El total debe reflejar el precio de servicio multiplicado
            const comisionServicioPorAnfitriona = Math.floor(nuevoPrecioServicio / usuarios.length);
            const comisionHabitacionPorAnfitriona = Math.floor(comisionHabitacion / usuarios.length);
            comisionTotalPorAnfitriona = comisionServicioPorAnfitriona + comisionHabitacionPorAnfitriona;

            // Actualizar el total correctamente
            const totalConComision = (precio_habitacion || 0) + nuevoPrecioServicio + (ivaFinal || 0);
            await query('UPDATE servicios SET total = ? WHERE id_servicio = ?', [
              totalConComision,
              servicioId
            ]);

            console.log('[SERVICIOS POST] Comisiones calculadas (con comisión):', {
              precioServicio: nuevoPrecioServicio,
              comisionHabitacion,
              cantidadAnfitrionas: usuarios.length,
              comisionServicioPorAnfitriona,
              comisionHabitacionPorAnfitriona,
              comisionTotalPorAnfitriona,
              totalConComision
            });

            for (const usuarioId of usuarios) {
              // Crear comisión para cada anfitriona (incluye comisión de habitación)
              const comisionResult: any = await query(
                `INSERT INTO comisiones (
                        venta_id,
                        servicio_id,
                        monto
                      ) VALUES (?, ?, ?)`,
                [
                  null, // venta_id es null para servicios
                  servicioId,
                  comisionTotalPorAnfitriona
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
                [comisionId, usuarioId, comisionTotalPorAnfitriona]
              );
            }
          } else {
            // Si la habitación NO tiene comisión:
            // - El valor de la habitación se multiplica por el número de chicas
            // - No se reparte comisión
            const nuevoPrecioHabitacion = (precio_habitacion || 0) * usuarios.length;
            await query('UPDATE servicios SET precio_habitacion = ?, total = ? WHERE id_servicio = ?', [
              nuevoPrecioHabitacion,
              (nuevoPrecioHabitacion + nuevoPrecioServicio + (ivaFinal || 0)),
              servicioId
            ]);
            console.log('[SERVICIOS POST] Habitación sin comisión, precio_habitacion multiplicado:', nuevoPrecioHabitacion);
          }
        }

        // Actualizar la caja activa
        const cajaActiva = (await query(
          'SELECT id_caja FROM cajas WHERE estado = 1 LIMIT 1'
        )) as any[];

        if (cajaActiva && cajaActiva.length > 0) {
          const cajaId = cajaActiva[0].id_caja;

          // Calcular el monto según el método de pago
          let montoEfectivo = 0;
          let montoTarjeta = 0;
          let montoTransferencia = 0;

          switch (metodo_pago) {
            case 'efectivo':
              montoEfectivo = totalFinal;
              break;
            case 'tarjeta':
              montoTarjeta = totalFinal;
              break;
            case 'transferencia':
              montoTransferencia = totalFinal;
              break;
            default:
              montoEfectivo = totalFinal; // Por defecto efectivo
          }

          // Actualizar la caja con los montos correspondientes, incluyendo IVA del servicio
          await query(
            `UPDATE cajas SET 
                    servicio = servicio + ?,
                    efectivo = efectivo + ?,
                    tarjeta = tarjeta + ?,
                    transferencia = transferencia + ?,
                    iva = iva + ?,
                    comision = comision + ?
                  WHERE id_caja = ?`,
            [
              totalFinal, // servicios
              montoEfectivo,
              montoTarjeta,
              montoTransferencia,
              ivaFinal,
              usuarios ? comisionTotalPorAnfitriona * usuarios.length : 0, // comisión total (incluye habitación)
              cajaId
            ]
          );

          cajaActualizada = true;
        }

        return {
          servicioId,
          comisionTotalPorAnfitriona
        };
      });

      return res.status(201).json({
        success: true,
        message: 'Servicio creado exitosamente',
        data: {
          id_servicio: result.servicioId,
          comisiones_creadas: usuarios ? usuarios.length : 0,
          comision_por_anfitriona: result.comisionTotalPorAnfitriona,
          caja_actualizada: cajaActualizada
        }
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: 'Error al crear servicio'
      });
    }
  } else {
    return res.status(405).json({
      success: false,
      message: `Método ${req.method} no permitido`
    });
  }
}

// Export with authentication
export default withAuth(handler);

function generateUniqueCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < 8; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}
