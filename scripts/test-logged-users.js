// Script para probar usuarios logueados
const mysql = require('mysql2/promise');

// Configuración de la base de datos
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'nuwesoft',
  port: parseInt(process.env.DB_PORT || '3307')
};

async function query(sql, params = []) {
  const connection = await mysql.createConnection(dbConfig);
  try {
    const [rows] = await connection.execute(sql, params);
    return rows;
  } finally {
    await connection.end();
  }
}

async function testLoggedUsers() {
  console.log('🔍 Probando usuarios logueados...');

  try {
    // 1. Verificar logins activos
    console.log('\n📋 Logins activos (estado = 1):');
    const activeLogins = await query(`
      SELECT 
        L.id_login,
        L.usuario_id,
        L.estado,
        L.last_login,
        U.nick,
        U.nombre,
        U.apellido,
        R.nombre as rol
      FROM logins L
      INNER JOIN usuarios U ON U.id_usuario = L.usuario_id
      INNER JOIN roles R ON R.id_rol = U.rol_id
      WHERE L.estado = 1
      ORDER BY R.nombre, U.nick
    `);
    
    if (activeLogins.length === 0) {
      console.log('   ❌ No hay logins activos');
    } else {
      activeLogins.forEach(login => {
        console.log(`   ✅ ${login.rol}: ${login.nick} (${login.nombre} ${login.apellido}) - ${login.last_login}`);
      });
    }

    // 2. Verificar usuarios por rol
    console.log('\n👥 Usuarios por rol:');
    
    const roles = ['Anfitriona', 'Garzon', 'Cajero'];
    
    for (const rol of roles) {
      const users = await query(`
        SELECT 
          U.id_usuario,
          U.nick,
          U.nombre,
          U.apellido,
          U.estado as user_estado,
          L.estado as login_estado,
          L.last_login
        FROM usuarios U
        INNER JOIN roles R ON R.id_rol = U.rol_id
        LEFT JOIN logins L ON L.usuario_id = U.id_usuario AND L.estado = 1
        WHERE R.nombre = ? AND U.estado = 1
        ORDER BY U.nick
      `, [rol]);
      
      console.log(`\n   ${rol}:`);
      if (users.length === 0) {
        console.log(`     ❌ No hay usuarios ${rol}`);
      } else {
        users.forEach(user => {
          const status = user.login_estado === 1 ? '🟢 Activo' : '🔴 Inactivo';
          console.log(`     ${status}: ${user.nick} (${user.nombre} ${user.apellido})`);
        });
      }
    }

    // 3. Verificar estadísticas como las obtiene la API
    console.log('\n📊 Estadísticas (como las obtiene la API):');
    
    const anfitrionas = await query(`
      SELECT U.id_usuario, U.nick, L.last_login, L.estado
      FROM logins L 
      INNER JOIN usuarios U ON U.id_usuario = L.usuario_id 
      INNER JOIN roles R ON R.id_rol = U.rol_id
      WHERE R.nombre = 'Anfitriona' AND L.estado = 1 AND DATE(L.last_login) = CURDATE()
    `);
    
    const garzones = await query(`
      SELECT U.id_usuario, U.nick, L.last_login, L.estado
      FROM logins L 
      INNER JOIN usuarios U ON U.id_usuario = L.usuario_id 
      INNER JOIN roles R ON R.id_rol = U.rol_id
      WHERE R.nombre = 'Garzon' AND L.estado = 1 AND DATE(L.last_login) = CURDATE()
    `);
    
    const cajeros = await query(`
      SELECT U.id_usuario, U.nick, L.last_login, L.estado
      FROM logins L 
      INNER JOIN usuarios U ON U.id_usuario = L.usuario_id 
      INNER JOIN roles R ON R.id_rol = U.rol_id
      WHERE R.nombre = 'Cajero' AND L.estado = 1 AND DATE(L.last_login) = CURDATE()
    `);
    
    console.log(`   Anfitrionas activas: ${anfitrionas.length}`);
    anfitrionas.forEach(user => console.log(`     - ${user.nick} (${user.last_login})`));
    
    console.log(`   Garzones activos: ${garzones.length}`);
    garzones.forEach(user => console.log(`     - ${user.nick} (${user.last_login})`));
    
    console.log(`   Cajeros activos: ${cajeros.length}`);
    cajeros.forEach(user => console.log(`     - ${user.nick} (${user.last_login})`));

    console.log('\n🎉 Prueba completada');

  } catch (error) {
    console.error('❌ Error probando usuarios logueados:', error);
    console.error('❌ Detalles del error:', {
      message: error.message,
      code: error.code,
      errno: error.errno
    });
  }
}

// Ejecutar prueba
testLoggedUsers();
