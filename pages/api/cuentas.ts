import type { NextApiRequest, NextApiResponse } from "next";
import { query } from "@/lib/db";
import { withTransaction } from "@/lib/transactionUtils";
import { sendNotificationToAll } from "@/pages/api/notifications/sse";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { method } = req;

  switch (method) {
    case "GET":
      return handleGet(req, res);
    case "POST":
      return handlePost(req, res);
    default:
      res.setHeader("Allow", ["GET", "POST"]);
      return res.status(405).json({
        success: false,
        message: `Método ${method} no permitido`
      });
  }
}

const handleGet = async (req: NextApiRequest, res: NextApiResponse) => {
  try {

    // Verificar si las tablas existen
    const tablesExist = await checkTablesExist();
    const { tipo, estado } = req.query;

    if (!tablesExist) {
      if (tipo === 'resumen') {
        return res.status(200).json({ total_por_cobrar: 48000 });
      }
      return res.status(200).json(getTestData());
    }

    if (tipo === 'resumen') {
      const sqlResumen = `
            SELECT SUM(total) as total_por_cobrar
            FROM cuentas
            WHERE estado = 1
        `;
      const resultResumen = await query(sqlResumen) as any[];
      return res.status(200).json({
        total_por_cobrar: resultResumen[0]?.total_por_cobrar || 0
      });
    }

    let whereClause = 'WHERE c.estado >= 0';
    const params: any[] = [];

    if (estado !== undefined) {
      whereClause = 'WHERE c.estado = ?';
      params.push(estado);
    }

    const sql = `
      SELECT 
        c.id_cuenta,
        c.codigo,
        c.cliente_id,
        c.total_comision,
        c.habitacion_id,
        c.sub_total,
        c.total,
        c.pedido_id,
        c.servicio_id,
        c.fecha_crea,
        c.estado,
        c.tiempo,
        CONCAT(cl.nombre, ' ', cl.apellido) as cliente_nombre,
        h.nombre as habitacion_numero,
        (
          SELECT COUNT(*) 
          FROM detalle_cuentas dc 
          WHERE dc.cuenta_id = c.id_cuenta
        ) as total_detalles,
        (
          SELECT COUNT(*) 
          FROM cuentas_usuarios cu 
          WHERE cu.cuenta_id = c.id_cuenta
        ) as total_usuarios
      FROM cuentas c
      LEFT JOIN clientes cl ON c.cliente_id = cl.id_cliente
      LEFT JOIN habitaciones h ON c.habitacion_id = h.id_habitacion
      ${whereClause}
      ORDER BY c.fecha_crea DESC
    `;

    const results = await query(sql, params);

    return res.status(200).json(results);
  } catch (error) {

    return res.status(500).json({
      success: false,
      message: "Error al obtener cuentas",
      error: error instanceof Error ? error.message : "Error desconocido"
    });
  }
};

const handlePost = async (req: NextApiRequest, res: NextApiResponse) => {
  try {

    const { codigo, cliente_id, total_comision, sub_total, total, habitacion_id, detalles, usuarios, tiempo } = req.body;

    // Validaciones
    if (!codigo || total_comision === undefined || sub_total === undefined || total === undefined || !detalles || !Array.isArray(detalles) || detalles.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Código, total_comision, sub_total, total y detalles son requeridos"
      });
    }

    // Verificar si las tablas existen
    const tablesExist = await checkTablesExist();

    if (!tablesExist) {
      return res.status(201).json({
        success: true,
        message: "Cuenta creada exitosamente (simulación)",
        data: {
          id_cuenta: Date.now(),
          codigo,
          cliente_id,
          habitacion_id,
          detalles,
          usuarios
        }
      });
    }

    const result = await withTransaction(async (trx) => {
      // 1. Insertar cuenta principal usando los valores del frontend
      const cuentaResult = await trx(
        `INSERT INTO cuentas (
          codigo, cliente_id, total_comision, habitacion_id, 
          sub_total, total, pedido_id, servicio_id, fecha_crea, estado, tiempo
        ) VALUES (?, ?, ?, ?, ?, ?, NULL, NULL, NOW(), 1, ?)`,
        [codigo, cliente_id, total_comision, habitacion_id || null, sub_total, total, tiempo || 0]
      );

      const cuentaId = (cuentaResult as any).insertId;

      // 2. Insertar detalles
      for (const detalle of detalles) {
        if (!detalle.producto_id || !detalle.precio || !detalle.cantidad || !detalle.sub_total) {
          throw new Error(`Detalle incompleto: ${JSON.stringify(detalle)}`);
        }

        const selectedHostesses = (detalle.hostesses && Array.isArray(detalle.hostesses) && detalle.hostesses.length > 0)
          ? detalle.hostesses
          : [null];

        // Determinar si es un producto que se comparte (champaña o >= 160k)
        // O si el usuario simplemente quiere que no se multiplique
        const precioTotal = detalle.precio || 0;
        const totalQty = detalle.cantidad || 1;
        const isChampagne = (detalle.isChampagne === true); // Pasado desde el frontend o detectado por nombre si lo pasáramos
        const isHighPrice = precioTotal >= 160000;

        if (isChampagne || isHighPrice) {
          // PARA CHAMPAÑA O PRODUCTOS CAROS: SE DIVIDE LA COMISIÓN
          const totalComm = Math.round(detalle.comision || 0);
          const commBase = Math.floor(totalComm / selectedHostesses.length);
          const remainder = totalComm % selectedHostesses.length;

          for (let i = 0; i < selectedHostesses.length; i++) {
            const hId = selectedHostesses[i];
            const finalComm = commBase + (i === 0 ? remainder : 0);

            await trx(
              `INSERT INTO detalle_cuentas (
                cuenta_id, producto_id, precio, cantidad, sub_total, comision, hostess_id, fecha_crea
              ) VALUES (?, ?, ?, ?, ?, ?, ?, NOW())`,
              [
                cuentaId,
                detalle.producto_id,
                detalle.precio,
                i === 0 ? totalQty : 0,
                i === 0 ? (detalle.sub_total || totalQty * detalle.precio) : 0,
                finalComm, // Se guarda la parte proporcional de la comisión
                hId
              ]
            );
          }
        } else {
          // PARA OTROS PRODUCTOS: SE REPARTE LA CANTIDAD (si el usuario seleccionó 2, 1 para cada una)
          const baseQty = Math.floor(totalQty / selectedHostesses.length);
          let remainingQty = totalQty;

          for (let i = 0; i < selectedHostesses.length; i++) {
            const hId = selectedHostesses[i];
            const isLast = i === selectedHostesses.length - 1;
            const itemQty = isLast ? remainingQty : (baseQty === 0 ? 1 : baseQty);
            remainingQty -= itemQty;

            if (itemQty > 0 || selectedHostesses.length === 1) {
              await trx(
                `INSERT INTO detalle_cuentas (
                  cuenta_id, producto_id, precio, cantidad, sub_total, comision, hostess_id, fecha_crea
                ) VALUES (?, ?, ?, ?, ?, ?, ?, NOW())`,
                [
                  cuentaId,
                  detalle.producto_id,
                  detalle.precio,
                  itemQty,
                  detalle.precio * itemQty,
                  detalle.comision || 0,
                  hId
                ]
              );
            }
          }
        }
      }

      // 3. Insertar usuarios/anfitrionas si se proporcionan
      if (usuarios && Array.isArray(usuarios) && usuarios.length > 0) {
        for (const usuarioId of usuarios) {
          await trx(
            `INSERT INTO cuentas_usuarios (cuenta_id, usuario_id) VALUES (?, ?)`,
            [cuentaId, usuarioId]
          );
          // Ocupar anfitriona si la cuenta tiene tiempo
          if (tiempo > 0) {
            await trx('UPDATE usuarios SET estado_servicio = 2 WHERE id_usuario = ?', [usuarioId]);
          }
        }
      }

      // 4. Ocupar habitación si tiene tiempo
      if (habitacion_id && tiempo > 0) {
        await trx('UPDATE habitaciones SET estado = 2 WHERE id_habitacion = ? AND (precio > 0 OR tiempo > 0 OR COALESCE(comision_anfitriona, 0) > 0)', [habitacion_id]);
      }

      const finalResult = {
        cuenta_id: cuentaId,
        codigo,
        cliente_id,
        habitacion_id: habitacion_id || null,
        sub_total: sub_total,
        total_comision: total_comision,
        total,
        detalles_count: detalles.length,
        usuarios_count: usuarios ? usuarios.length : 0
      };

      // Si tiene habitación y tiempo, notificar inicio de timer
      if (habitacion_id && tiempo > 0) {
        try {
          // Obtener nombre de cliente para la notificación
          const clienteRow = await trx(`SELECT nombre FROM clientes WHERE id_cliente = ?`, [cliente_id]) as any[];
          const cliente_nombre = clienteRow[0]?.nombre || 'Cliente';

          // Obtener información de la habitación
          const habitacionRow = (await trx('SELECT nombre FROM habitaciones WHERE id_habitacion = ?', [habitacion_id])) as any[];

          // Obtener la fecha real de creación desde el servidor DB para el timer
          const [fechaCreaRow]: any = await trx(`SELECT fecha_crea FROM cuentas WHERE id_cuenta = ?`, [cuentaId]);
          const dbFechaCrea = fechaCreaRow?.fecha_crea || new Date();
          const startTimeIso = dbFechaCrea instanceof Date ? dbFechaCrea.toISOString() : dbFechaCrea;

          await sendNotificationToAll('timer_started', {
            servicioId: cuentaId,
            roomId: habitacion_id,
            roomName: habitacionRow[0]?.nombre || habitacion_id,
            duration: tiempo,
            startTime: startTimeIso,
            codigo,
            clienteNombre: cliente_nombre,
            tipoTransaccion: 'cuenta',
            status: 1
          });

          // Notificar estado de anfitrionas
          if (usuarios && Array.isArray(usuarios)) {
            for (const uId of usuarios) {
              await sendNotificationToAll('user_status_updated', {
                userId: uId,
                status: 2 // Ocupado
              });
            }
          }
        } catch (sseError) {
          console.error('[SSE] Error sending notifications for cuenta:', sseError);
        }
      }

      return finalResult;
    });

    return res.status(201).json({
      success: true,
      message: "Cuenta creada exitosamente",
      data: result
    });

  } catch (error) {

    return res.status(500).json({
      success: false,
      message: "Error al crear la cuenta",
      error: error instanceof Error ? error.message : "Error desconocido"
    });
  }
};

const checkTablesExist = async () => {
  try {
    await query("SELECT 1 FROM cuentas LIMIT 1");
    await query("SELECT 1 FROM detalle_cuentas LIMIT 1");
    await query("SELECT 1 FROM cuentas_usuarios LIMIT 1");
    return true;
  } catch (error) {
    return false;
  }
};

const getTestData = () => {
  return [
    {
      id_cuenta: 1,
      codigo: "CUENTA-001",
      cliente_id: 1,
      total_comision: 5000,
      habitacion_id: 101,
      sub_total: 25000,
      total: 30000,
      pedido_id: null,
      servicio_id: null,
      fecha_crea: "2024-01-15T10:30:00.000Z",
      estado: 1,
      cliente_nombre: "Juan Pérez",
      habitacion_numero: "Habitación 101",
      total_detalles: 2,
      total_usuarios: 1
    },
    {
      id_cuenta: 2,
      codigo: "CUENTA-002",
      cliente_id: 2,
      total_comision: 3000,
      habitacion_id: 102,
      sub_total: 15000,
      total: 18000,
      pedido_id: null,
      servicio_id: null,
      fecha_crea: "2024-01-15T11:45:00.000Z",
      estado: 1,
      cliente_nombre: "María García",
      habitacion_numero: "Habitación 102",
      total_detalles: 1,
      total_usuarios: 2
    }
  ];
}; 