
const mysql = require('mysql2/promise');

async function testFullQuery() {
    const connection = await mysql.createConnection({
        host: '127.0.0.1',
        user: 'root',
        password: '',
        database: 'lasmunecasderamon',
        port: 3306
    });

    try {
        const whereClause = 'WHERE 1=1 AND v.caja_id = 1';
        const params = [];
        const limitNum = 50;
        const offset = 0;

        const salesSql = `
      SELECT 
        v.id_venta, 
        v.codigo,
        v.total, 
        v.fecha_crea, 
        v.estado, 
        v.metodo_pago, 
        v.propina, 
        v.tiempo,
        v.cliente_id, 
        CASE 
          WHEN v.cliente_id IS NULL THEN 'Sin cliente registrado'
          ELSE COALESCE(CONCAT(c.nombre, ' ', c.apellido), '')
        END as cliente_nombre,
        c.apellido as cliente_apellido,
        v.habitacion_id,
        h.nombre as habitacion_nombre,
        v.pedido_id,
        CASE 
          WHEN v.pedido_id IS NOT NULL THEN CONCAT(g.nombre, ' ', g.apellido)
          ELSE NULL
        END as garzon_nombre,
        CASE 
          WHEN v.pedido_id IS NOT NULL THEN g.nick
          ELSE NULL
        END as garzon_nick,
        GROUP_CONCAT(DISTINCT u.nick SEPARATOR ', ') as usuarios_nicks,
        GROUP_CONCAT(DISTINCT CONCAT(u.nombre, ' ', u.apellido) SEPARATOR ', ') as usuario_nombre,
        (
          SELECT COALESCE(SUM(dc.comision), 0) 
          FROM comisiones com2
          LEFT JOIN detalle_comisiones dc ON dc.comision_id = com2.id_comision
          WHERE com2.venta_id = v.id_venta
        ) as comision,
        CASE 
          WHEN (
            SELECT COALESCE(SUM(dc.comision), 0) 
            FROM comisiones com2
            LEFT JOIN detalle_comisiones dc ON dc.comision_id = com2.id_comision
            WHERE com2.venta_id = v.id_venta
          ) > 0 THEN 1
          ELSE 0
        END as tiene_comision,
        (
          SELECT u_cajero.nick 
          FROM usuarios u_cajero 
          WHERE u_cajero.id_usuario = v.created_by
        ) as cajero_nick
      FROM ventas v 
      LEFT JOIN clientes c ON v.cliente_id = c.id_cliente
      LEFT JOIN habitaciones h ON v.habitacion_id = h.id_habitacion
      LEFT JOIN pedidos p ON v.pedido_id = p.id_pedido
      LEFT JOIN usuarios g ON p.mesero_id = g.id_usuario
      LEFT JOIN ventas_usuarios vu ON v.id_venta = vu.venta_id
      LEFT JOIN usuarios u ON vu.usuario_id = u.id_usuario 
      ${whereClause}
      GROUP BY v.id_venta, v.codigo, v.total, v.fecha_crea, v.estado, v.metodo_pago, v.propina, v.tiempo, v.cliente_id, c.nombre, c.apellido, v.habitacion_id, h.nombre, v.pedido_id, g.nombre, g.apellido, g.nick
      ORDER BY v.fecha_crea DESC 
      LIMIT ${limitNum} OFFSET ${offset}
    `;

        const [salesResult] = await connection.query(salesSql, params);
        console.log('Sales Count:', salesResult.length);
        console.table(salesResult);

    } catch (e) {
        console.error(e);
    } finally {
        await connection.end();
    }
}

testFullQuery();
