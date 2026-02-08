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

async function checkPermissions() {
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

    // Verificar si existe la tabla de permisos
    const [tables] = await connection.query(
      "SHOW TABLES LIKE 'permissions'"
    );

    if (tables.length === 0) {
      console.log('✗ La tabla permissions NO existe');
      return;
    }

    console.log('✓ Tabla permissions existe');

    // Obtener todos los permisos
    const [permissions] = await connection.query(
      "SELECT * FROM permissions ORDER BY module, action"
    );

    console.log('\n📋 Permisos actuales:');
    console.log('Módulo\t\tAcción\t\tPermiso\t\tDescripción');
    console.log('──────\t\t──────\t\t───────\t\t──────────');

    const modules = new Set();
    permissions.forEach(perm => {
      modules.add(perm.module);
      console.log(`${perm.module.padEnd(16)}\t${perm.action.padEnd(16)}\t${perm.name.padEnd(16)}\t${perm.description}`);
    });

    console.log(`\n📊 Total de módulos: ${modules.size}`);
    console.log('📦 Módulos configurados:');
    modules.forEach(module => {
      console.log(`  - ${module}`);
    });

    // Verificar roles y sus permisos
    const [roles] = await connection.query(
      "SELECT * FROM roles ORDER BY nombre"
    );

    console.log('\n👥 Roles configurados:');
    roles.forEach(role => {
      console.log(`  - ${role.nombre} (ID: ${role.id_rol})`);
    });

    // Verificar permisos por rol
    const [rolePermissions] = await connection.query(`
      SELECT 
        r.nombre AS rol,
        p.module AS modulo,
        p.action AS accion,
        p.name AS permiso
      FROM role_permissions rp
      JOIN roles r ON r.id_rol = rp.role_id
      JOIN permissions p ON p.id = rp.permission_id
      ORDER BY r.nombre, p.module, p.action
    `);

    console.log('\n🔐 Permisos por rol:');
    let currentRole = '';
    rolePermissions.forEach(rp => {
      if (rp.rol !== currentRole) {
        currentRole = rp.rol;
        console.log(`\n  📌 ${currentRole}:`);
      }
      console.log(`    - ${rp.modulo}.${rp.accion} (${rp.permiso})`);
    });

  } catch (error) {
    console.error('✗ Error:', error.message);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

checkPermissions();
