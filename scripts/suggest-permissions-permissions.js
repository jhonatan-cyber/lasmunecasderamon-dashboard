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

async function suggestPermissionsModule() {
  let connection;
  
  try {
    connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      perm: process.env.DB_PORT || 3306
    });

    console.log('🔧 ANÁLISIS Y RECOMENDACIONES PARA MÓDULO PERMISOS');
    console.log('=' .repeat(60));

    // 1. VERIFICAR PERMISOS ACTUALES DE PERMISOS
    console.log('\n📋 1. Permisos actuales del módulo permissions:');
    
    const [currentPerms] = await connection.query(
      "SELECT id, name, description, action FROM permissions WHERE module = 'permissions' ORDER BY action"
    );

    if (currentPerms.length === 0) {
      console.log('  ✗ No hay permisos para el módulo permissions');
    } else {
      currentPerms.forEach(perm => {
        console.log(`  - ${perm.action}: ${perm.name} (${perm.description})`);
      });
    }

    // 2. ANÁLISIS DE NECESIDADES Y RECOMENDACIONES
    console.log('\n🎯 2. Análisis de necesidades y recomendaciones:');
    
    console.log('\n📋 Permisos esenciales para gestión del sistema:');
    const essentialPermissions = [
      {
        name: 'ver_permisos',
        description: 'Ver configuración de permisos del sistema',
        action: 'ver'
      },
      {
        name: 'crear_permisos',
        description: 'Crear nuevos permisos en el sistema',
        action: 'crear'
      },
      {
        name: 'editar_permisos',
        description: 'Editar permisos existentes',
        action: 'editar'
      },
      {
        name: 'eliminar_permisos',
        description: 'Eliminar permisos del sistema',
        action: 'eliminar'
      }
    ];

    console.log('Permisos esenciales:');
    essentialPermissions.forEach(perm => {
      console.log(`  - ${perm.action}: ${perm.name} (${perm.description})`);
    });

    console.log('\n📋 Permisos recomendados para operaciones avanzadas:');
    const advancedPermissions = [
      {
        name: 'exportar_permisos',
        description: 'Exportar configuración de permisos',
        action: 'exportar'
      },
      {
        name: 'importar_permisos',
        description: 'Importar configuración de permisos',
        action: 'importar'
      },
      {
        name: 'respaldar_permisos',
        description: 'Respaldar configuración de permisos a estado anterior',
        action: 'respaldar'
      }
    ];

    console.log('Permisos avanzados (opcional):');
    advancedPermissions.forEach(perm => {
      console.log(`  - ${perm.action}: ${perm.name} (${perm.description})`);
    });

    console.log('\n📋 Permisos específicos por módulo (si se necesitan):');
    const moduleSpecificPermissions = [
      {
        name: 'ver_permisos_usuarios',
        description: 'Ver permisos del módulo usuarios',
        action: 'ver_permisos'
      },
      {
        name: 'ver_permisos_clientes',
        description: 'Ver permisos del módulo clientes',
        action: 'ver_permisos_clientes'
      },
      {
        name: 'ver_permisos_ventas',
        description: 'Ver permisos del módulo ventas',
        action: 'ver_permisos_ventas'
      },
      {
        name: 'ver_permisos_caja',
        description: 'Ver permisos del módulo caja',
        action: 'ver_permisos_caja'
      }
    ];

    console.log('Permisos específicos por módulo (si se necesitan):');
    moduleSpecificPermissions.forEach(perm => {
      console.log(`  - ${perm.action}: ${perm.name} (${perm.description})`);
    });

    console.log('\n🎯 Recomendación final:');
    console.log('  📋 Mínimo esencial: 4 permisos (ver, crear, editar, eliminar)');
    console.log('  📋 Recomendado: 7 permisos (incluyendo avanzados)');
    console.log('  📋 Completo: 11 permisos (incluyendo específicos por módulo)');

    // 3. DEFINIR PERMISOS SEGÚN RECOMENDACIÓN
    console.log('\n🎯 3. Creando permisos según recomendación...');
    
    const recommendedPermissions = [
      ...essentialPermissions,
      ...advancedPermissions
    ];

    console.log('Creando permisos según recomendación:');
    recommendedPermissions.forEach(perm => {
      console.log(`  - ${perm.action}: ${perm.name} (${perm.description})`);
    });

    // 4. ELIMINAR PERMISOS ANTIGUOS DEL MÓDULO PERMISOS
    console.log('\n🗑️ 4. Eliminando permisos antiguos del módulo permissions...');
    
    const [deletedCount] = await connection.query(
      "DELETE FROM permissions WHERE module = 'permissions'"
    );
    
    console.log(`  ✓ Eliminados ${deletedCount.affectedRows} permisos antiguos`);

    // 5. CREAR NUEVOS PERMISOS
    console.log('\n➕ 5. Creando permisos según recomendación...');
    
    let createdCount = 0;
    for (const perm of recommendedPermissions) {
      try {
        await connection.query(
          `INSERT INTO permissions (name, description, module, action) 
           VALUES (?, ?, 'permissions', ?)`,
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

    // 6. OBTENER IDS DE LOS NUEVOS PERMISOS
    console.log('\n🔍 6. Obteniendo IDs de los nuevos permisos...');
    
    const [newPermsWithIds] = await connection.query(
      "SELECT id, name, action FROM permissions WHERE module = 'permissions' ORDER BY action"
    );

    const permMap = {};
    newPermsWithIds.forEach(perm => {
      permMap[perm.action] = perm.id;
      console.log(`  - ${perm.action}: ID ${perm.id} (${perm.name})`);
    });

    // 7. ASIGNAR PERMISOS A ROLES (LÓGICA DE NEGOCIO)
    console.log('\n👥 7. Asignando permisos a roles...');
    
    // Obtener roles
    const [roles] = await connection.query("SELECT id_rol, nombre FROM roles ORDER BY nombre");
    
    for (const role of roles) {
      let permissionsToAssign = [];
      
      switch (role.nombre.toLowerCase()) {
        case 'administrador':
          // Administrador: todos los permisos (pero tiene acceso completo por rol)
          permissionsToAssign = Object.values(permMap);
          console.log(`  📋 Administrador: todos los permisos (${permissionsToAssign.length})`);
          break;
          
        case 'cajero':
          // Cajero: necesita acceso a permisos para su trabajo
          permissionsToAssign = [
            permMap['ver'],
            permMap['ver_permisos_usuarios'],
            permMap['ver_permisos_clientes'],
            permMap['ver_permisos_ventas'],
            permMap['ver_permisos_caja']
          ];
          console.log(`  💰 Cajero: permisos esenciales (${permissionsToAssign.length} permisos)`);
          break;
          
        case 'anfitriona':
          // Anfitriona: necesita acceso a permisos para su trabajo
          permissionsToAssign = [
            permMap['ver'],
            permMap['ver_permisos_usuarios'],
            permMap['ver_permisos_clientes'],
            permMap['ver_permisos_ventas'],
            permMap['ver_permisos_caja']
          ];
          console.log(`  🏠 Anfitriona: permisos esenciales (${permissionsToAssign.length} permisos)`);
          break;
          
        case 'garzon':
          // Garzón: acceso básico a permisos
          permissionsToAssign = [
            permMap['ver'],
            permMap['ver_permisos_usuarios'],
            permMap['ver_permisos_clientes']
          ];
          console.log(`  🍽️ Garzón: permisos básicos (${permissionsToAssign.length} permisos)`);
          break;
          
        default:
          console.log(`  ❓ Rol desconocido: ${role.nombre} - sin permisos asignados`);
          continue;
      }

      // Eliminar asignaciones anteriores para este rol en el módulo permissions
      await connection.query(`
        DELETE rp FROM role_permissions rp
        INNER JOIN permissions p ON rp.permission_id = p.id
        WHERE rp.role_id = ? AND p.module = 'permissions'
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

    // 8. VERIFICACIÓN FINAL
    console.log('\n✅ 8. Verificación final del módulo permissions...');
    
    const [finalPerms] = await connection.query(`
      SELECT p.name, p.action, p.description,
             GROUP_CONCAT(r.nombre) as roles
      FROM permissions p
      LEFT JOIN role_permissions rp ON p.id = rp.permission_id
      LEFT JOIN roles r ON rp.role_id = r.id_rol
      WHERE p.module = 'permissions'
      GROUP BY p.id
      ORDER BY p.action
    `);

    console.log('\nPermisos finales del módulo permissions:');
    finalPerms.forEach(perm => {
      const roles = perm.roles ? perm.roles.split(',') : ['Sin asignar'];
      console.log(`  📋 ${perm.action}: ${perm.name}`);
      console.log(`     📝 ${perm.description}`);
      console.log(`     👥 Roles: ${roles.join(', ')}`);
      console.log('');
    });

    // 9. ESTADÍSTICAS
    const [stats] = await connection.query(`
      SELECT 
        COUNT(*) as total_permisos,
        COUNT(DISTINCT p.action) as acciones_unicas,
        COUNT(DISTINCT rp.role_id) as roles_con_permisos
      FROM permissions p
      LEFT JOIN role_permissions rp ON p.id = rp.permission_id
      WHERE p.module = 'permissions'
    `);

    const statistics = stats[0];
    console.log('\n📊 Estadísticas del módulo permissions:');
    console.log(`  - Total permisos: ${statistics.total_permisos}`);
    console.log(`  - Acciones únicas: ${statistics.acciones_unicas}`);
    console.log(`  - Roles con permisos: ${statistics.roles_con_permisos}`);

    console.log('\n✅ Refinamiento del módulo permissions completado exitosamente');

  } catch (error) {
    console.error('✗ Error:', error.message);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

suggestPermissionsModule();
