require('dotenv').config();
const mysql = require('mysql2/promise');

async function checkDatabase() {
  try {
    console.log('🔍 Verificando conexión a la base de datos...');
    
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'admin_dashboard',
      port: parseInt(process.env.DB_PORT || '3306')
    });
    
    console.log('✅ Conexión exitosa a la base de datos');
    
    // Verificar usuarios
    const [users] = await connection.execute(
      'SELECT id_usuario, email, nombre, rol_id, estado FROM usuarios WHERE estado = 1 LIMIT 5'
    );
    
    console.log('📊 Usuarios encontrados:', users.length);
    if (users.length > 0) {
      console.log('📧 Emails disponibles:');
      users.forEach(user => {
        console.log(`  - ${user.email} (${user.nombre})`);
      });
    } else {
      console.log('❌ No hay usuarios activos');
    }
    
    await connection.end();
    
  } catch (error) {
    console.error('❌ Error de conexión:', error.message);
    console.error('💡 Verifica las variables de entorno en .env');
  }
}

checkDatabase();
