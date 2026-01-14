const mysql = require('mysql2/promise');

async function testAPIResponse() {
  console.log('=== PRUEBA DE RESPUESTA DEL API ===\n');
  
  const config = {
    host: '127.0.0.1',
    user: 'nuwesoft',
    password: '***REMOVED***',
    database: 'lasmunecasderamon',
    port: 3306
  };

  const connection = await mysql.createConnection(config);

  try {
    // Simular exactamente lo que hace handleGetLista
    console.log('--- SIMULANDO handleGetLista ---\n');
    
    const page = 1;
    const limit = 10;
    const estado = undefined;
    const pageNum = parseInt(String(page));
    const limitNum = parseInt(String(limit));
    const offset = (pageNum - 1) * limitNum;

    let whereClause = 'WHERE 1=1';
    const params = [];

    if (estado) {
      whereClause += ' AND v.estado = ?';
      params.push(estado);
    }

    console.log('Parámetros:');
    console.log('- pageNum:', pageNum);
    console.log('- limitNum:', limitNum);
    console.log('- offset:', offset);
    console.log('- whereClause:', whereClause);
    console.log();

    // Contar ventas
    console.log('1. Contando ventas...');
    const countSql = `SELECT COUNT(*) as total FROM ventas v ${whereClause}`;
    console.log('Query:', countSql);
    const [countResult] = await connection.query(countSql, params);
    const total = countResult[0]?.total || 0;
    console.log('✅ Total ventas:', total);
    console.log();

    // Obtener ventas
    console.log('2. Obteniendo ventas...');
    const salesSql = `
      SELECT 
        v.id_venta, 
        v.codigo,
        v.total, 
        v.fecha_crea, 
        v.estado, 
        v.metodo_pago, 
        v.propina, 
        v.cliente_id, 
        c.nombre as cliente_nombre, 
        c.apellido as cliente_apellido,
        v.habitacion_id,
        h.nombre as habitacion_nombre,
        GROUP_CONCAT(u.nick SEPARATOR ', ') as usuarios_nicks
      FROM ventas v 
      LEFT JOIN clientes c ON v.cliente_id = c.id_cliente
      LEFT JOIN habitaciones h ON v.habitacion_id = h.id_habitacion
      LEFT JOIN ventas_usuarios vu ON v.id_venta = vu.venta_id
      LEFT JOIN usuarios u ON vu.usuario_id = u.id_usuario 
      ${whereClause}
      GROUP BY v.id_venta
      ORDER BY v.fecha_crea DESC 
      LIMIT ? OFFSET ?
    `;
    console.log('Query:', salesSql);
    const [salesResult] = await connection.query(salesSql, [...params, limitNum, offset]);
    console.log('✅ Ventas obtenidas:', salesResult.length);
    console.log();

    // Calcular páginas
    const totalPages = Math.ceil(total / limitNum);
    console.log('3. Información de paginación:');
    console.log('- Total ventas:', total);
    console.log('- Total páginas:', totalPages);
    console.log('- Página actual:', pageNum);
    console.log('- Límite por página:', limitNum);
    console.log();

    // Procesar ventas (como lo hace el API)
    console.log('4. Procesando ventas...');
    const processedSales = await Promise.all(
      salesResult.map(async venta => {
        // Obtener usuarios
        const usuariosSql = `
          SELECT u.id_usuario, u.nick 
          FROM ventas_usuarios vu 
          JOIN usuarios u ON vu.usuario_id = u.id_usuario 
          WHERE vu.venta_id = ?
        `;
        const [usuariosResult] = await connection.query(usuariosSql, [venta.id_venta]);
        const usuarios = usuariosResult.map(u => ({
          id: u.id_usuario,
          name: u.nick
        }));

        // Obtener detalles
        const detallesSql = `
          SELECT 
            dv.id_detalle_venta,
            dv.producto_id,
            p.nombre as producto_nombre,
            dv.cantidad,
            dv.precio_unitario,
            dv.comision
          FROM detalle_ventas dv
          LEFT JOIN productos p ON dv.producto_id = p.id_producto
          WHERE dv.venta_id = ?
        `;
        const [detallesResult] = await connection.query(detallesSql, [venta.id_venta]);

        return {
          ...venta,
          id: venta.id_venta,
          usuarios,
          detalles: detallesResult,
          cliente_nombre: venta.cliente_nombre
            ? `${venta.cliente_nombre} ${venta.cliente_apellido || ''}`.trim()
            : 'Sin cliente',
          habitacion_nombre: venta.habitacion_nombre || 'Sin habitación'
        };
      })
    );

    console.log('✅ Ventas procesadas:', processedSales.length);
    console.log();

    // Mostrar respuesta final (como JSON)
    console.log('5. RESPUESTA FINAL (como JSON):');
    const response = {
      success: true,
      data: processedSales,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: totalPages
      }
    };
    console.log(JSON.stringify(response, null, 2));

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await connection.end();
    console.log('\n=== FIN DE LA PRUEBA ===');
  }
}

testAPIResponse().catch(console.error);
