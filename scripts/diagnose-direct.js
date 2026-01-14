const mysql = require('mysql2/promise');

async function diagnose() {
  console.log('=== DIAGNÓSTICO DE PRODUCCIÓN ===\n');
  
  const config = {
    host: '127.0.0.1',
    user: 'nuwesoft',
    password: 'Ancasi96nuwe',
    database: 'lasmunecasderamon',
    port: 3306
  };

  console.log('Conectando a:');
  console.log('Host:', config.host);
  console.log('Usuario:', config.user);
  console.log('Base de datos:', config.database);
  console.log('Puerto:', config.port);
  console.log();

  const connection = await mysql.createConnection(config);

  try {
    console.log('✅ Conexión establecida\n');

    // 1. Verificar cliente_id = 1
    console.log('--- 1. VERIFICAR CLIENTE ID=1 ---');
    const [clientes] = await connection.query('SELECT * FROM clientes WHERE id_cliente = 1');
    if (clientes.length > 0) {
      console.log('✅ Cliente ID=1 existe:', clientes[0]);
    } else {
      console.log('❌ Cliente ID=1 NO existe');
    }
    console.log();

    // 2. Verificar tabla habitaciones
    console.log('--- 2. VERIFICAR TABLA HABITACIONES ---');
    try {
      const [habitacionesCount] = await connection.query('SELECT COUNT(*) as total FROM habitaciones');
      console.log('✅ Tabla habitaciones existe, total registros:', habitacionesCount[0].total);
      const [sample] = await connection.query('SELECT * FROM habitaciones LIMIT 3');
      console.log('Muestra:', sample);
    } catch (error) {
      console.log('❌ Error con tabla habitaciones:', error.message);
    }
    console.log();

    // 3. Verificar estructura de ventas
    console.log('--- 3. ESTRUCTURA TABLA VENTAS ---');
    const [ventasStructure] = await connection.query('DESCRIBE ventas');
    console.log('Columnas:', ventasStructure.map(c => c.Field).join(', '));
    console.log();

    // 4. Verificar SQL_MODE
    console.log('--- 4. VERIFICAR SQL_MODE ---');
    const [sqlMode] = await connection.query("SELECT @@sql_mode as mode");
    console.log('SQL_MODE:', sqlMode[0].mode);
    const hasOnlyFullGroupBy = sqlMode[0].mode.includes('ONLY_FULL_GROUP_BY');
    console.log('ONLY_FULL_GROUP_BY:', hasOnlyFullGroupBy ? '✅ ACTIVO' : '❌ INACTIVO');
    console.log();

    // 5. Probar query simple de ventas
    console.log('--- 5. PROBAR QUERY SIMPLE DE VENTAS ---');
    try {
      const [ventasSimple] = await connection.query('SELECT * FROM ventas LIMIT 5');
      console.log('✅ Query simple ejecutado correctamente');
      console.log('Total ventas obtenidas:', ventasSimple.length);
      if (ventasSimple.length > 0) {
        console.log('Primera venta:', ventasSimple[0]);
      }
    } catch (error) {
      console.log('❌ Error en query simple:', error.message);
    }
    console.log();

    // 6. Probar el query EXACTO que usa el API
    console.log('--- 6. PROBAR QUERY EXACTO DEL API ---');
    try {
      const [ventas] = await connection.query(`
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
        WHERE 1=1
        GROUP BY v.id_venta
        ORDER BY v.fecha_crea DESC 
        LIMIT 5
      `);
      console.log('✅ Query del API ejecutado correctamente');
      console.log('Total ventas obtenidas:', ventas.length);
      if (ventas.length > 0) {
        console.log('Primera venta:', ventas[0]);
      }
    } catch (error) {
      console.log('❌ Error en query del API:', error.message);
      console.log('Código de error:', error.code);
      console.log('SQL State:', error.sqlState);
      console.log('Información completa:', error);
    }
    console.log();

    // 7. Verificar clientes activos
    console.log('--- 7. VERIFICAR CLIENTES ACTIVOS ---');
    const [clientesActivos] = await connection.query('SELECT COUNT(*) as total FROM clientes WHERE estado = 1');
    console.log('Total clientes activos:', clientesActivos[0].total);
    const [clientesMuestra] = await connection.query('SELECT id_cliente, nombre, apellido, estado FROM clientes LIMIT 5');
    console.log('Muestra de clientes:', clientesMuestra);
    console.log();

    // 8. Verificar si hay ventas
    console.log('--- 8. VERIFICAR VENTAS EXISTENTES ---');
    const [totalVentas] = await connection.query('SELECT COUNT(*) as total FROM ventas');
    console.log('Total ventas en BD:', totalVentas[0].total);
    const [ventasMuestra] = await connection.query('SELECT * FROM ventas LIMIT 3');
    console.log('Muestra de ventas:', ventasMuestra);
    console.log();

    // 9. Verificar foreign keys
    console.log('--- 9. VERIFICAR FOREIGN KEYS DE VENTAS ---');
    const [fks] = await connection.query(`
      SELECT 
        CONSTRAINT_NAME,
        COLUMN_NAME,
        REFERENCED_TABLE_NAME,
        REFERENCED_COLUMN_NAME
      FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
      WHERE TABLE_NAME = 'ventas' 
      AND TABLE_SCHEMA = DATABASE()
      AND REFERENCED_TABLE_NAME IS NOT NULL
    `);
    console.log('Foreign Keys:', fks);
    console.log();

    // 10. Verificar si falta cliente en una venta
    console.log('--- 10. VERIFICAR INTEGRIDAD DE CLIENTES ---');
    const [ventasSinCliente] = await connection.query(`
      SELECT v.id_venta, v.cliente_id 
      FROM ventas v 
      LEFT JOIN clientes c ON v.cliente_id = c.id_cliente 
      WHERE c.id_cliente IS NULL
      LIMIT 5
    `);
    if (ventasSinCliente.length > 0) {
      console.log('⚠️  Encontradas ventas con cliente_id inválido:');
      console.log(ventasSinCliente);
    } else {
      console.log('✅ Todas las ventas tienen cliente válido');
    }

  } catch (error) {
    console.error('❌ Error general:', error);
  } finally {
    await connection.end();
    console.log('\n=== FIN DEL DIAGNÓSTICO ===');
  }
}

diagnose().catch(console.error);
