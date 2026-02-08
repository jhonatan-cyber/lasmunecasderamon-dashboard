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

async function refineDevolucionesPermissions() {
  let connection;
  
  try {
    connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      port: process.env.DB_PORT || 3306
    });

    console.log('🔧 REFINANDO MÓDULO DEVOLUCIONES');
    console.log('=' .repeat(60));
    console.log('📋 Especificación: Solo permiso listar (acceso al módulo) y libre internamente');

    // 1. VERIFICAR PERMISOS ACTUALES DE DEVOLUCIONES
    console.log('\n📋 1. Permisos actuales del módulo devoluciones:');
    
    const [currentPerms] = await connection.query(
      "SELECT id, name, description, action FROM permissions WHERE module = 'devoluciones' ORDER BY action"
    );

    if (currentPerms.length === 0) {
      console.log('  ✗ No hay permisos para el módulo devoluciones');
    } else {
      currentPerms.forEach(perm => {
        console.log(`  - ${perm.action}: ${perm.name} (${perm.description})`);
      });
    }

    // 2. DEFINIR NUEVO PERMISO SEGÚN ESPECIFICACIÓN
    console.log('\n🎯 2. Definiendo nuevo permiso según especificación:');
    
    const newPermissions = [
      {
        name: 'listar_devoluciones',
        description: 'Acceso al módulo de devoluciones',
        action: 'listar'
      }
    ];

    console.log('Nuevo permiso a crear:');
    newPermissions.forEach(perm => {
      console.log(`  - ${perm.action}: ${perm.name} (${perm.description})`);
    });

    // 3. ELIMINAR PERMISOS ANTIGUOS DEL MÓDULO DEVOLUCIONES
    console.log('\n🗑️ 3. Eliminando permisos antiguos del módulo devoluciones...');
    
    const [deletedCount] = await connection.query(
      "DELETE FROM permissions WHERE module = 'devoluciones'"
    );
    
    console.log(`  ✓ Eliminados ${deletedCount.affectedRows} permisos antiguos`);

    // 4. CREAR NUEVO PERMISO
    console.log('\n➕ 4. Creando nuevo permiso...');
    
    let createdCount = 0;
    for (const perm of newPermissions) {
      try {
        await connection.query(
          `INSERT INTO permissions (name, description, module, action) 
           VALUES (?, ?, 'devoluciones', ?)`,
          [perm.name, perm.description, perm.action]
        );
        console.log(`  ✓ Creado: ${perm.name}`);
        createdCount++;
      } catch (error) {
        if (error.code === 'ER_DUP_ENTRY') {
          console.log(`  ⚠️  Ya existe: ${perm.name}`);
        } else {
          console.log(`  ✗ Error creando ${perm.name}: ${error.message}`);
        }
      }
    }

    console.log(`\n  ✓ Total creados: ${createdCount} permisos`);

    // 5. OBTENER ID DEL NUEVO PERMISO
    console.log('\n🔍 5. Obteniendo ID del nuevo permiso...');
    
    const [newPermsWithIds] = await connection.query(
      "SELECT id, name, action FROM permissions WHERE module = 'devoluciones' ORDER BY action"
    );

    const permMap = {};
    newPermsWithIds.forEach(perm => {
      permMap[perm.action] = perm.id;
      console.log(`  - ${perm.action}: ID ${perm.id} (${perm.name})`);
    });

    // 6. ASIGNAR PERMISOS A ROLES (LÓGICA DE NEGOCIO)
    console.log('\n👥 6. Asignando permisos a roles...');
    
    // Obtener roles
    const [roles] = await connection.query("SELECT id_rol, nombre FROM roles ORDER BY nombre");
    
    for (const role of roles) {
      let permissionsToAssign = [];
      
      switch (role.nombre.toLowerCase()) {
        case 'administrador':
          // Administrador: acceso al módulo (pero tiene acceso completo por rol)
          permissionsToAssign = Object.values(permMap);
          console.log(`  📋 Administrador: acceso al módulo (${permissionsToAssign.length} permiso)`);
          break;
          
        case 'cajero':
          // Cajero: necesita acceso a devoluciones para su trabajo
          permissionsToAssign = Object.values(permMap);
          console.log(`  💰 Cajero: acceso al módulo (${permissionsToAssign.length} permiso)`);
          break;
          
        case 'anfitriona':
          // Anfitriona: necesita acceso a devoluciones para gestión
          permissionsToAssign = Object.values(permMap);
          console.log(`  🏠 Anfitriona: acceso al módulo (${permissionsToAssign.length} permiso)`);
          break;
          
        case 'garzon':
          // Garzón: acceso a devoluciones para ver sus propias devoluciones
          permissionsToAssign = Object.values(permMap);
          console.log(`  🍽️ Garzón: acceso al módulo (${permissionsToAssign.length} permiso)`);
          break;
          
        default:
          console.log(`  ❓ Rol desconocido: ${role.nombre} - sin permisos asignados`);
          continue;
      }

      // Eliminar asignaciones anteriores para este rol en el módulo devoluciones
      await connection.query(`
        DELETE rp FROM role_permissions rp
        INNER JOIN permissions p ON rp.permission_id = p.id
        WHERE rp.role_id = ? AND p.module = 'devoluciones'
      `, [role.id_rol]);

      // Asignar nuevos permisos
      if (permissionsToAssign.length > 0) {
        for (const permId of permissionsToAssign) {
          if (permId) {
            await connection.query(
              "INSERT IGNORE INTO role_permissions (role_id, permission_id) VALUES (?, ?)",
              [role.id_rol, permId]
            );
          }
        }
      }
    }

    // 7. VERIFICACIÓN FINAL
    console.log('\n✅ 7. Verificación final del módulo devoluciones...');
    
    const [finalPerms] = await connection.query(`
      SELECT p.name, p.action, p.description,
             GROUP_CONCAT(r.nombre) as roles
      FROM permissions p
      LEFT JOIN role_permissions rp ON p.id = rp.permission_id
      LEFT JOIN roles r ON rp.role_id = r.id_rol
      WHERE p.module = 'devoluciones'
      GROUP BY p.id
      ORDER BY p.action
    `);

    console.log('\nPermisos finales del módulo devoluciones:');
    finalPerms.forEach(perm => {
      const roles = perm.roles ? perm.roles.split(',') : ['Sin asignar'];
      console.log(`  📋 ${perm.action}: ${perm.name}`);
      console.log(`     📝 ${perm.description}`);
      console.log(`     👥 Roles: ${roles.join(', ')}`);
      console.log('');
    });

    // 8. ESTADÍSTICAS
    const [stats] = await connection.query(`
      SELECT 
        COUNT(*) as total_permisos,
        COUNT(DISTINCT p.action) as acciones_unicas,
        COUNT(DISTINCT rp.role_id) as roles_con_permisos
      FROM permissions p
      LEFT JOIN role_permissions rp ON p.id = rp.permission_id
      WHERE p.module = 'devoluciones'
    `);

    const statistics = stats[0];
    console.log('\n📊 Estadísticas del módulo devoluciones:');
    console.log(`  - Total permisos: ${statistics.total_permisos}`);
    console.log(`  - Acciones únicas: ${statistics.acciones_unicas}`);
    console.log(`  - Roles con permisos: ${statistics.roles_con_permisos}`);

    console.log('\n🎯 Implementación simple y directa:');
    console.log('  1️⃣  Acceso al módulo → listar_devoluciones');
    console.log('  2️⃣  Una vez dentro del módulo, el usuario puede navegar libremente');
    console.log('  3️⃣  Sin restricciones adicionales dentro del módulo');

    console.log('\n🔐 Implementación de libertad interna:');
    console.log('  - Muchas operaciones diferentes dentro del módulo');
    console.log('  - Flexibilidad completa para el usuario');
    console.log('  - Control solo a nivel de entrada');

    console.log('\n✅ Refinamiento del módulo devoluciones completado exitosamente');

  } catch (error) {
    console.error('✗ Error:', error.message);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

refineDevolucionesPermissions();
