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

async function suggestCuentasPermissions() {
  let connection;
  
  try {
    connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      port: process.env.DB_PORT || 3306
    });

    console.log('🔧 ANÁLISIS Y RECOMENDACIONES PARA MÓDULO CUENTAS');
    console.log('=' .repeat(60));

    // 1. VERIFICAR PERMISOS ACTUALES DE CUENTAS
    console.log('\n📋 1. Permisos actuales del módulo cuentas:');
    
    const [currentPerms] = await connection.query(
      "SELECT id, name, description, action FROM permissions WHERE module = 'cuentas' ORDER BY action"
    );

    if (currentPerms.length === 0) {
      console.log('  ✗ No hay permisos para el módulo cuentas');
    } else {
      currentPerms.forEach(perm => {
        console.log(`  - ${perm.action}: ${perm.name} (${perm.description})`);
      });
    }

    // 2. ANÁLISIS DE NECESIDADES Y RECOMENDACIONES
    console.log('\n🎯 2. Análisis de necesidades y recomendaciones:');
    
    console.log('\n📋 Opción 1: Permisos básicos (mínimo esencial):');
    const basicPermissions = [
      {
        name: 'listar_cuentas',
        description: 'Acceso al listado de cuentas',
        action: 'listar'
      },
      {
        name: 'crear_cuentas',
        description: 'Crear nuevas cuentas',
        action: 'crear'
      },
      {
        name: 'ver_detalles_cuentas',
        description: 'Ver detalles específicos de cuentas',
        action: 'ver_detalles'
      },
      {
        name: 'editar_cuentas',
        description: 'Editar cuentas (agregar productos, cobrar)',
        action: 'editar'
      }
    ];

    console.log('Permisos básicos:');
    basicPermissions.forEach(perm => {
      console.log(`  - ${perm.action}: ${perm.name} (${perm.description})`);
    });

    console.log('\n📋 Opción 2: Permisos granulares (recomendado):');
    const granularPermissions = [
      {
        name: 'listar_cuentas',
        description: 'Acceso al listado de cuentas',
        action: 'listar'
      },
      {
        name: 'crear_cuentas',
        description: 'Crear nuevas cuentas',
        action: 'crear'
      },
      {
        name: 'ver_detalles_cuentas',
        description: 'Ver detalles específicos de cuentas',
        action: 'ver_detalles'
      },
      {
        name: 'agregar_productos_cuenta',
        description: 'Agregar productos a una cuenta existente',
        action: 'agregar_productos'
      },
      {
        name: 'cobrar_cuenta',
        description: 'Cobrar una cuenta existente',
        action: 'cobrar'
      }
    ];

    console.log('Permisos granulares:');
    granularPermissions.forEach(perm => {
      console.log(`  - ${perm.action}: ${perm.name} (${perm.description})`);
    });

    console.log('\n📋 Opción 3: Permisos completos (incluyendo gestión avanzada):');
    const completePermissions = [
      ...granularPermissions,
      {
        name: 'editar_cuentas',
        description: 'Editar información general de cuentas',
        action: 'editar'
      },
      {
        name: 'anular_cuentas',
        description: 'Anular cuentas existentes',
        action: 'anular'
      },
      {
        name: 'eliminar_cuentas',
        description: 'Eliminar cuentas del sistema',
        action: 'eliminar'
      }
    ];

    console.log('Permisos completos:');
    completePermissions.forEach(perm => {
      console.log(`  - ${perm.action}: ${perm.name} (${perm.description})`);
    });

    console.log('\n🎯 Recomendación final:');
    console.log('  📋 Mínimo esencial: 4 permisos (listar, crear, ver_detalles, editar)');
    console.log('  📋 Recomendado: 5 permisos (granular con separación de operaciones)');
    console.log('  📋 Completo: 8 permisos (incluyendo gestión avanzada)');

    console.log('\n🔍 Análisis de separación de operaciones:');
    console.log('  ✅ Ventajas de permisos separados:');
    console.log('     - Mayor control granular de operaciones');
    console.log('     - Mejor auditoría y seguimiento');
    console.log('     - Diferentes roles pueden tener diferentes niveles de acceso');
    console.log('     - Más seguro y específico para cada operación');

    console.log('\n  ⚠️ Consideraciones:');
    console.log('     - Mayor complejidad en la gestión de permisos');
    console.log('     - Más permisos que asignar a los roles');
    console.log('     - Requiere más validaciones en el frontend');

    // 3. DEFINIR PERMISOS SEGÚN RECOMENDACIÓN (Opción granular)
    console.log('\n🎯 3. Creando permisos según recomendación granular...');
    
    const recommendedPermissions = granularPermissions;

    console.log('Creando permisos según recomendación granular:');
    recommendedPermissions.forEach(perm => {
      console.log(`  - ${perm.action}: ${perm.name} (${perm.description})`);
    });

    // 4. ELIMINAR PERMISOS ANTIGUOS DEL MÓDULO CUENTAS
    console.log('\n🗑️ 4. Eliminando permisos antiguos del módulo cuentas...');
    
    const [deletedCount] = await connection.query(
      "DELETE FROM permissions WHERE module = 'cuentas'"
    );
    
    console.log(`  ✓ Eliminados ${deletedCount.affectedRows} permisos antiguos`);

    // 5. CREAR NUEVOS PERMISOS
    console.log('\n➕ 5. Creando permisos según recomendación...');
    
    let createdCount = 0;
    for (const perm of recommendedPermissions) {
      try {
        await connection.query(
          `INSERT INTO permissions (name, description, module, action) 
           VALUES (?, ?, 'cuentas', ?)`,
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
      "SELECT id, name, action FROM permissions WHERE module = 'cuentas' ORDER BY action"
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
          // Cajero: gestión completa de cuentas
          permissionsToAssign = [
            permMap['listar'],
            permMap['crear'],
            permMap['ver_detalles'],
            permMap['agregar_productos'],
            permMap['cobrar']
          ];
          console.log(`  💰 Cajero: gestión completa (${permissionsToAssign.length} permisos)`);
          break;
          
        case 'anfitriona':
          // Anfitriona: gestión básica de cuentas
          permissionsToAssign = [
            permMap['listar'],
            permMap['ver_detalles'],
            permMap['agregar_productos']
          ];
          console.log(`  🏠 Anfitriona: gestión básica (${permissionsToAssign.length} permisos)`);
          break;
          
        case 'garzon':
          // Garzón: consulta de cuentas
          permissionsToAssign = [
            permMap['listar'],
            permMap['ver_detalles']
          ];
          console.log(`  🍽️ Garzón: consulta (${permissionsToAssign.length} permisos)`);
          break;
          
        default:
          console.log(`  ❓ Rol desconocido: ${role.nombre} - sin permisos asignados`);
          continue;
      }

      // Eliminar asignaciones anteriores para este rol en el módulo cuentas
      await connection.query(`
        DELETE rp FROM role_permissions rp
        INNER JOIN permissions p ON rp.permission_id = p.id
        WHERE rp.role_id = ? AND p.module = 'cuentas'
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
    console.log('\n✅ 8. Verificación final del módulo cuentas...');
    
    const [finalPerms] = await connection.query(`
      SELECT p.name, p.action, p.description,
             GROUP_CONCAT(r.nombre) as roles
      FROM permissions p
      LEFT JOIN role_permissions rp ON p.id = rp.permission_id
      LEFT JOIN roles r ON rp.role_id = r.id_rol
      WHERE p.module = 'cuentas'
      GROUP BY p.id
      ORDER BY p.action
    `);

    console.log('\nPermisos finales del módulo cuentas:');
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
      WHERE p.module = 'cuentas'
    `);

    const statistics = stats[0];
    console.log('\n📊 Estadísticas del módulo cuentas:');
    console.log(`  - Total permisos: ${statistics.total_permisos}`);
    console.log(`  - Acciones únicas: ${statistics.acciones_unicas}`);
    console.log(`  - Roles con permisos: ${statistics.roles_con_permisos}`);

    console.log('\n🎯 Flujo de gestión implementado:');
    console.log('  1️⃣  Listar cuentas → listar_cuentas');
    console.log('  2️⃣  Crear cuentas → crear_cuentas');
    console.log('  3️⃣  Ver detalles → ver_detalles_cuentas');
    console.log('  4️⃣  Agregar productos → agregar_productos_cuenta');
    console.log('  5️⃣  Cobrar cuenta → cobrar_cuenta');

    console.log('\n🔐 Implementación de permisos granulares:');
    console.log('  - Separación clara entre agregar productos y cobrar');
    console.log('  - Mayor control de acceso por operación');
    console.log('  - Mejor auditoría y seguimiento de acciones');

    console.log('\n✅ Refinamiento del módulo cuentas completado exitosamente');

  } catch (error) {
    console.error('✗ Error:', error.message);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

suggestCuentasPermissions();
