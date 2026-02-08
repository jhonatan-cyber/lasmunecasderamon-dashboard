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

async function testPermissionsEndpoint() {
  let connection;
  
  try {
    connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      port: process.env.DB_PORT || 3306
    });

    console.log('🔍 PRUEBA DEL ENDPOINT DE PERMISOS');
    console.log('=' .repeat(80));

    // 1. OBTENER UN USUARIO GARZÓN
    console.log('\n📋 1. Buscando usuario con rol garzón...');
    
    const [garzonUsers] = await connection.query(`
      SELECT u.id_usuario, u.nombre, u.nick, r.nombre as rol
      FROM usuarios u
      INNER JOIN roles r ON u.rol_id = r.id_rol
      WHERE LOWER(r.nombre) = 'garzon'
      LIMIT 1
    `);

    if (garzonUsers.length === 0) {
      console.log('  ❌ No se encontraron usuarios con rol garzón');
      return;
    }

    const garzonUser = garzonUsers[0];
    console.log(`  ✅ Usuario encontrado: ${garzonUser.nombre} (${garzonUser.nick}) - ID: ${garzonUser.id_usuario}`);

    // 2. SIMULAR LA LÓGICA DEL ENDPOINT
    console.log('\n📋 2. Simulando lógica del endpoint /api/users/[id]/permissions...');
    
    // Obtener el rol del usuario
    const [userResult] = await connection.query(`
      SELECT rol_id FROM usuarios WHERE id_usuario = ?
    `, [garzonUser.id_usuario]);

    if (!userResult || userResult.length === 0) {
      console.log('  ❌ Usuario no encontrado');
      return;
    }

    const roleId = userResult[0].rol_id;
    console.log(`  ✅ Rol ID: ${roleId}`);

    // Obtener los permisos del rol del usuario
    const [permissions] = await connection.query(`
      SELECT 
        p.id,
        p.name,
        p.description,
        p.module,
        p.action
      FROM permissions p
      INNER JOIN role_permissions rp ON p.id = rp.permission_id
      WHERE rp.role_id = ? AND p.deleted_at IS NULL
      ORDER BY p.module, p.action
    `, [roleId]);

    console.log(`  ✅ Permisos encontrados: ${permissions.length}`);

    // 3. VERIFICAR PERMISOS ESPECÍFICOS
    console.log('\n📋 3. Verificando permisos específicos para pedidos...');
    
    const pedidosPerms = permissions.filter(p => p.module === 'pedidos');
    console.log(`  📋 Permisos de pedidos: ${pedidosPerms.length}`);
    
    pedidosPerms.forEach(perm => {
      console.log(`    - ${perm.action}: ${perm.name}`);
    });

    // 4. VERIFICAR SI TIENE LOS PERMISOS ESPERADOS
    console.log('\n📋 4. Verificando permisos esperados...');
    
    const expectedPerms = ['listar', 'crear'];
    const hasListar = pedidosPerms.some(p => p.action === 'listar');
    const hasCrear = pedidosPerms.some(p => p.action === 'crear');
    
    console.log(`  ✅ Tiene permiso 'listar': ${hasListar ? 'SÍ' : 'NO'}`);
    console.log(`  ✅ Tiene permiso 'crear': ${hasCrear ? 'SÍ' : 'NO'}`);

    // 5. VERIFICAR TODOS LOS PERMISOS
    console.log('\n📋 5. Todos los permisos del usuario:');
    
    const groupedPerms = {};
    permissions.forEach(perm => {
      if (!groupedPerms[perm.module]) {
        groupedPerms[perm.module] = [];
      }
      groupedPerms[perm.module].push(perm.action);
    });

    Object.keys(groupedPerms).sort().forEach(module => {
      console.log(`  📋 ${module}: ${groupedPerms[module].join(', ')}`);
    });

    // 6. VERIFICAR CONSISTENCIA CON LA BASE DE DATOS
    console.log('\n📋 6. Verificando consistencia con la base de datos...');
    
    const [dbPerms] = await connection.query(`
      SELECT 
        r.nombre as rol,
        p.module,
        p.action,
        p.name as permission_name
      FROM role_permissions rp
      INNER JOIN permissions p ON rp.permission_id = p.id
      INNER JOIN roles r ON rp.role_id = r.id_rol
      WHERE r.nombre = 'garzon' AND p.module = 'pedidos'
      ORDER BY p.action
    `);

    console.log(`  ✅ Permisos en DB para garzón.pedidos: ${dbPerms.length}`);
    dbPerms.forEach(perm => {
      console.log(`    - ${perm.action}: ${perm.permission_name}`);
    });

    // 7. DIAGNÓSTICO FINAL
    console.log('\n📋 7. Diagnóstico final...');
    
    if (hasListar && hasCrear) {
      console.log('  ✅ El usuario garzón TIENE los permisos necesarios');
      console.log('  ✅ El endpoint debería devolver los permisos correctamente');
      console.log('  ⚠️ Si el usuario aún puede acceder sin permisos, el problema está en:');
      console.log('     1. Cache del frontend');
      console.log('     2. Componente PermissionGuard no actualizado');
      console.log('     3. Hook useUserPermissions no refrescando');
    } else {
      console.log('  ❌ El usuario garzón NO tiene los permisos necesarios');
      console.log('  ❌ El problema está en la asignación de permisos en la base de datos');
    }

  } catch (error) {
    console.error('✗ Error en la prueba:', error.message);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

testPermissionsEndpoint();
