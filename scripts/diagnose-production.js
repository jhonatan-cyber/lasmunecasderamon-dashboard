const mysql = require('mysql2/promise');
require('dotenv').config({ path: '.env.local' });
require('dotenv').config({ path: '.env' });

async function diagnose() {
  console.log('=== DIAGNÓSTICO DE PRODUCCIÓN ===\n');
  
  // Mostrar variables de entorno (sin mostrar password)
  console.log('Variables de entorno:');
  console.log('DB_HOST:', process.env.DB_HOST || process.env.DATABASE_URL?.split('@')[1]?.split(':')[0] || 'NO DEFINIDA');
  console.log('DB_USER:', process.env.DB_USER || 'NO DEFINIDA');
  console.log('DB_PASSWORD:', process.env.DB_PASSWORD ? '***' : 'NO DEFINIDA');
  console.log('DB_NAME:', process.env.DB_NAME || 'NO DEFINIDA');
  console.log('DB_PORT:', process.env.DB_PORT || '3306 (default)');
  console.log();

  // Si no hay credenciales, intentar con variables comunes
  const host = process.env.DB_HOST || process.env.MYSQL_HOST || 'localhost';
  const user = process.env.DB_USER || process.env.MYSQL_USER || 'root';
  const password = process.env.DB_PASSWORD || process.env.MYSQL_PASSWORD || '';
  const database = process.env.DB_NAME || process.env.MYSQL_DATABASE || 'lasmuñecasderamon';
  const port = process.env.DB_PORT || process.env.MYSQL_PORT || 3306;

  console.log('Intentando conectar con:');
  console.log('Host:', host);
  console.log('Usuario:', user);
  console.log('Base de datos:', database);
  console.log('Puerto:', port);
  console.log();

  const connection = await mysql.createConnection({
    host,
    user,
    password,
    database,
    port
  });

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
      const [habitaciones] = await connection.query('SELECT COUNT(*) as total FROM habitaciones');
      console.log('✅ Tabla habitaciones existe, total registros:', habitaciones[0].total);
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

    // 5. Probar query de ventas
    console.log('--- 5. PROBAR QUERY DE VENTAS ---');
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
      console.log('✅ Query ejecutado correctamente');
      console.log('Total ventas obtenidas:', ventas.length);
      if (ventas.length > 0) {
        console.log('Primera venta:', ventas[0]);
      }
    } catch (error) {
      console.log('❌ Error en query:', error.message);
      console.log('SQL State:', error.sqlState);
      console.log('SQL Message:', error.sqlMessage);
    }
    console.log();

    // 6. Verificar clientes activos
    console.log('--- 6. VERIFICAR CLIENTES ACTIVOS ---');
    const [clientesActivos] = await connection.query('SELECT COUNT(*) as total FROM clientes WHERE estado = 1');
    console.log('Total clientes activos:', clientesActivos[0].total);
    const [clientesMuestra] = await connection.query('SELECT id_cliente, nombre, apellido, estado FROM clientes LIMIT 5');
    console.log('Muestra de clientes:', clientesMuestra);
    console.log();

    // 7. Verificar si hay ventas
    console.log('--- 7. VERIFICAR VENTAS EXISTENTES ---');
    const [totalVentas] = await connection.query('SELECT COUNT(*) as total FROM ventas');
    console.log('Total ventas en BD:', totalVentas[0].total);
    console.log();

    // 8. Verificar foreign keys
    console.log('--- 8. VERIFICAR FOREIGN KEYS DE VENTAS ---');
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

  } catch (error) {
    console.error('❌ Error general:', error);
  } finally {
    await connection.end();
    console.log('\n=== FIN DEL DIAGNÓSTICO ===');
  }
}

diagnose().catch(console.error);
