const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

// Leer variables de entorno manualmente
function loadEnv() {
  const envPath = path.join(__dirname, '../.env.local');
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8');
    envContent.split('\n').forEach(line => {
      const [key, ...valueParts] = line.split('=');
      if (key && valueParts.length > 0) {
        process.env[key.trim()] = valueParts.join('=').trim();
      }
    });
  }
}

loadEnv();

async function fixAnfitrionaPermissions() {
  let connection;
  
  try {
    connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      port: process.env.DB_PORT || 3306
    });

    console.log('✓ Conectado a la base de datos');

    // Obtener ID del rol anfitriona
    const [roles] = await connection.query("SELECT id_rol, nombre FROM roles WHERE nombre = 'anfitriona'");
    if (roles.length === 0) {
      console.log('✗ No se encontró el rol "anfitriona"');
      return;
    }

    const anfitrionaId = roles[0].id_rol;
    console.log(`✓ Rol anfitriona encontrado (ID: ${anfitrionaId})`);

    // Permisos específicos para anfitriona
    const anfitrionaPermissions = [
      'ver_habitaciones',
      'ver_estado_habitaciones',
      'editar_habitaciones',
      'ver_servicios',
      'activar_servicios',
      'desactivar_servicios',
      'ver_clientes',
      'crear_clientes',
      'ver_pedidos',
      'procesar_pedidos',
      'aprobar-solicitud-servicio',
      'rechazar-solicitud-servicio',
      'ver_reportes_servicios'
    ];

    console.log('\n🔐 Asignando permisos a anfitriona...');
    
    for (const permName of anfitrionaPermissions) {
      const [perm] = await connection.query(
        "SELECT id FROM permissions WHERE name = ?",
        [permName]
      );
      
      if (perm.length > 0) {
        await connection.query(
          `INSERT IGNORE INTO role_permissions (role_id, permission_id) 
           VALUES (?, ?)`,
          [anfitrionaId, perm[0].id]
        );
        console.log(`  ✓ ${permName}`);
      } else {
        console.log(`  ✗ Permiso no encontrado: ${permName}`);
      }
    }

    // Verificar resultado
    const [finalCount] = await connection.query(
      "SELECT COUNT(*) as count FROM role_permissions WHERE role_id = ?",
      [anfitrionaId]
    );

    console.log(`\n✅ Anfitriona ahora tiene ${finalCount[0].count} permisos asignados`);

  } catch (error) {
    console.error('✗ Error:', error.message);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

fixAnfitrionaPermissions();
