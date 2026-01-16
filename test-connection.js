const mysql = require('mysql2/promise');
require('dotenv').config();

async function testConnection() {
  console.log('🔍 Probando conexión a la base de datos...\n');

  const config = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'nuwesoft',
    port: parseInt(process.env.DB_PORT || '3306')
  };

  console.log('📋 Configuración desde .env:');
  console.log(`   Host: ${config.host}`);
  console.log(`   Puerto: ${config.port}`);
  console.log(`   Usuario: ${config.user}`);
  console.log(`   Password: ${config.password ? '***' : '(vacío)'}`);
  console.log(`   Base de datos: ${config.database}\n`);

  let connection;

  try {
    console.log('🔌 Intentando conectar...');
    connection = await mysql.createConnection(config);
    console.log('✅ Conexión exitosa!\n');

    // Probar consulta simple
    console.log('🔍 Probando consulta SELECT 1...');
    const [result] = await connection.query('SELECT 1 as test');
    console.log('✅ Consulta exitosa:', result);

    // Verificar si existe la tabla usuarios
    console.log('\n🔍 Verificando tabla usuarios...');
    const [tables] = await connection.query(
      `SELECT COUNT(*) as count FROM information_schema.TABLES 
       WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'usuarios'`,
      [config.database]
    );
    
    if (tables[0].count > 0) {
      console.log('✅ Tabla usuarios existe');
      
      // Contar usuarios
      const [users] = await connection.query('SELECT COUNT(*) as count FROM usuarios WHERE estado = 1');
      console.log(`✅ Usuarios activos: ${users[0].count}`);
    } else {
      console.log('❌ Tabla usuarios NO existe');
    }

    console.log('\n✨ ¡Todo está funcionando correctamente!');

  } catch (error) {
    console.error('\n❌ Error de conexión:');
    console.error('   Código:', error.code);
    console.error('   Mensaje:', error.message);
    
    if (error.code === 'ECONNREFUSED') {
      console.error('\n💡 Sugerencias:');
      console.error('   - MySQL no está corriendo en el puerto ' + config.port);
      console.error('   - Verifica que MySQL esté iniciado');
      console.error('   - Verifica el puerto correcto en tu .env');
    } else if (error.code === 'ER_ACCESS_DENIED_ERROR') {
      console.error('\n💡 Sugerencias:');
      console.error('   - Usuario o contraseña incorrectos');
      console.error('   - Verifica las credenciales en tu .env');
    } else if (error.code === 'ER_BAD_DB_ERROR') {
      console.error('\n💡 Sugerencias:');
      console.error('   - La base de datos "' + config.database + '" no existe');
      console.error('   - Verifica el nombre en tu .env');
      console.error('   - Asegúrate de haber importado el SQL');
    }
    
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
      console.log('\n🔌 Conexión cerrada');
    }
  }
}

testConnection();
