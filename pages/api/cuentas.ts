import type { NextApiRequest, NextApiResponse } from "next";
import { query } from "@/lib/db";
import { withTransaction } from "@/lib/transactionUtils";

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
    
    if (!tablesExist) {
      return res.status(200).json(getTestData());
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
      WHERE c.estado >= 0
      ORDER BY c.fecha_crea DESC
    `;

    const results = await query(sql);

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

    const { codigo, cliente_id, total_comision, sub_total, total, habitacion_id, detalles, usuarios } = req.body;

    // Validaciones
    if (!codigo || !cliente_id || total_comision === undefined || sub_total === undefined || total === undefined || !detalles || !Array.isArray(detalles) || detalles.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Código, cliente_id, total_comision, sub_total, total y detalles son requeridos"
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
          sub_total, total, pedido_id, servicio_id, fecha_crea, estado
        ) VALUES (?, ?, ?, ?, ?, ?, NULL, NULL, NOW(), 1)`,
        [codigo, cliente_id, total_comision, habitacion_id || null, sub_total, total]
      );

      const cuentaId = (cuentaResult as any).insertId;

      // 2. Insertar detalles
      for (const detalle of detalles) {
        
        // Validar que todos los campos requeridos estén presentes
        if (!detalle.producto_id || !detalle.precio || !detalle.cantidad || !detalle.sub_total) {
          throw new Error(`Detalle incompleto: ${JSON.stringify(detalle)}`);
        }
        
        await trx(
          `INSERT INTO detalle_cuentas (
            cuenta_id, producto_id, precio, cantidad, sub_total, comision
          ) VALUES (?, ?, ?, ?, ?, ?)`,
          [
            cuentaId,
            detalle.producto_id,
            detalle.precio,
            detalle.cantidad,
            detalle.sub_total,
            detalle.comision || 0
          ]
        );
      }

      // 3. Insertar usuarios/anfitrionas si se proporcionan
      if (usuarios && Array.isArray(usuarios) && usuarios.length > 0) {
        for (const usuarioId of usuarios) {
          await trx(
            `INSERT INTO cuentas_usuarios (cuenta_id, usuario_id) VALUES (?, ?)`,
            [cuentaId, usuarioId]
          );
        }
      }

      return {
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