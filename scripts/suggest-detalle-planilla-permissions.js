const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

// Leer variables de entorno manualmente
function loadEnv() {
  const envPath = path.join(__dirname, '../.env.local');
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'path.join(__dirname, '../.env.local'));
    envContent.split('\n').forEach(line => {
      const [key, ...valueParts] = line.split('=');
      if (key && valueParts.length > 0) {
        process.env[key.trim()] = valueParts.join('=').trim();
      }
    });
  }
}

loadEnv();

async function suggestDetallePlanillaPermissions() {
  let connection;
  
  try {
    connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env DB_NAME,
      port: process.env.DB_PORT || 3306
    });

    console.log('🔧 ANÁLISIS Y RECOMENDACIONES PARA MÓDULO DETALLE PLANILLA');
    console.log('=' .repeat(60));
    console.log('📋 Ruta: /payroll/calendar con calendario interactivo');

    // 1. VERIFICAR SI EXISTE EL MÓDULO
    console.log('\n📋 1. Verificando si existe el módulo detalle_planilla...');
    
    const [moduleCheck] = await connection.query(
      "SELECT COUNT(*) as count FROM permissions WHERE module = 'detalle_planilla'"
    );

    if (moduleCheck[0].count === 0) {
      console.log('  ✗ No hay permisos para el módulo detalle_planilla');
    } else {
      console.log(`  ✓ Ya existen ${moduleCheck[0].count} permisos en detalle_planilla`);
      
      const [currentPerms] = await connection.query(
        "SELECT id, name, description, action FROM permissions WHERE module = 'detalle_planilla' ORDER BY action"
      );
      
      console.log('  Permisos actuales:');
      currentPerms.forEach(perm => {
        console.log(`    - ${perm.action}: ${perm.name} (${perm.description})`);
      });
    }

    // 2. ANÁLISIS DE NECESIDADES Y RECOMENDACIONES
    console.log('\n🎯 2. Análisis de necesidades y recomendaciones:');
    
    console.log('\n📋 Permisos esenciales para calendario interactivo:');
    const calendarPermissions = [
      {
        name: 'ver_calendario_planilla',
        description: 'Acceso al calendario de planilla',
        action: 'ver_calendario'
      },
      {
        name: 'ver_detalles_dia_planilla',
        description: 'Ver detalles de un día específico en el calendario',
        action: 'ver_detalles_dia'
      }
    ];

    console.log('Permisos para calendario:');
    calendarPermissions.forEach(perm => {
      console.log(`  - ${perm.action}: ${perm.name} (${perm.description})`);
    });

    console.log('\n📋 Permisos para operaciones de pago:');
    const paymentPermissions = [
      {
        name: 'ver_ventas_dia',
        description: 'Ver ventas de un día específico',
        action: 'ver_ventas_dia'
      },
      {
        name: 'ver_servicios_dia',
        description: 'Ver servicios de un día específico',
        action: 'ver_servicios_dia'
      },
      {
        name: 'pagar_dia',
        description: 'Pagar las ventas y servicios de un día específico',
        action: 'pagar_dia'
      }
    ];

    console.log('Permisos para operaciones de pago:');
    paymentPermissions.forEach(perm => {
      console.log(`  - ${perm.action}: ${perm.name} (${perm.description})`);
    });

    console.log('\n📋 Permisos de gestión avanzada:');
    const advancedPermissions = [
      {
        name: 'exportar_planilla',
        description: 'Exportar datos de planilla',
        action: 'exportar'
      },
      {
        name: 'ajustar_planilla',
        description: 'Ajustar configuración de planilla',
        action: 'ajustar'
      }
    ];

    console.log('Permisos de gestión avanzada:');
    advancedPermissions.forEach(perm => {
      console.log(`  - ${perm.action}: ${perm.name} (${perm.description})`);
    });

    console.log('\n🎯 Recomendación final:');
    console.log('  📋 Mínimo esencial: 2 permisos (ver_calendario, ver_detalles_dia)');
    console.log('  📋 Recomendado: 5 permisos (incluyendo operaciones de pago)');
    console.log('  📋 Completo: 7 permisos (incluyendo gestión avanzada)');

    // 3. DEFINIR PERMISOS SEGÚN RECOMENDACIÓN
    console.log('\n🎯 3. Creando permisos según recomendación...');
    
    const recommendedPermissions = [
      ...calendarPermissions,
      ...paymentPermissions
    ];

    console.log('Permisos recomendados:');
    recommendedPermissions.forEach(perm => {
      console.log(`  - ${perm.action}: ${perm.name} (${perm.description})`);
    });

    // 4. ELIMINAR PERMISOS ANTIGUOS DEL MÓDULO DETALLE_PLANILLA
    console.log('\n🗑️ 4. Eliminando permisos antiguos del módulo detalle_planilla...');
    
    const [deletedCount] = await connection.query(
      "DELETE FROM permissions WHERE module = 'detalle_planilla'"
    );
    
    console.log(`  ✓ Eliminados ${deletedCount.affectedRows} permisos antiguos`);

    // 5. CREAR NUEVOS PERMISOS
    console.log('\n➕ 5. Creando permisos según recomendación...');
    
    let createdCount = 0;
    for (const perm of recommendedPermissions) {
      try {
        await connection.query(
          `INSERT INTO permissions (name, description, module, action) 
           VALUES (?, ?, 'detalle_planilla', ?)`,
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
      "SELECT id, name, action FROM permissions WHERE module = 'detalle_planilla' ORDER BY action"
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
          // Cajero: gestión completa de planilla
          permissionsToAssign = [
            permMap['ver_calendario'],
            permMap['ver_detalles_dia'],
            permMap['ver_ventas_dia'],
            permMap['ver_servicios_dia'],
            permMap['pagar_dia']
          ];
          console.log(`  💰 Cajero: gestión completa (${permissionsToAssign.length} permisos)`);
          break;
          
        case 'anfitriona':
          // Anfitriona: gestión básica de planilla
          permissionsToAssign = [
            permMap['ver_calendario'],
            permMap['ver_detalles_dia'],
            permMap['ver_ventas_dia'],
            permMap['ver_servicios_dia']
          ];
          console.log(`  🏠 Anfitriona: gestión básica (${permissionsToAssign.length} permisos)`);
          break;
          
        case 'garzon':
          // Garzón: consulta de planilla
          permissionsToAssign = [
            permMap['ver_calendario'],
            permMap['ver_detalles_dia']
          ];
          console.log(`  🍽️ Garzón: consulta (${permissionsToAssign.length} permisos)`);
          break;
          
        default:
          console.log(`  ❓ Rol desconocido: ${role.nombre} - sin permisos asignados`);
          continue;
      }

      // Eliminar asignaciones anteriores para este rol en el módulo detalle_planilla
      await connection.query(`
        DELETE rp FROM role_permissions rp
        INNER JOIN permissions p ON rp.permission_id = p.id
        WHERE rp.role_id = ? AND p.module = 'detalle_planilla'
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
    console.log('\n✅ 8. Verificación final del módulo detalle_planilla...');
    
    const [finalPerms] = await connection.query(`
      SELECT p.name, p.action, p.description,
             GROUP_CONCAT(r.nombre) as roles
      FROM permissions p
      LEFT JOIN role_permissions rp ON p.id = rp.permission_id
      LEFT JOIN roles r ON rp.role_id = r.id_rol
      WHERE p.module = 'detalle_planilla'
      GROUP BY p.id
      ORDER BY p.action
    `);

    console.log('\nPermisos finales del módulo detalle_planilla:');
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
      WHERE p.module = 'detalle_planilla'
    `);

    const statistics = stats[0];
    console.log('\n📊 Estadísticas del módulo detalle_planilla:');
    console.log(`  - Total permisos: ${statistics.total_permisos}`);
    console.log(`  - Acciones únicas: ${statistics.acciones_unicas}`);
    console.log(`  - Roles con permisos: ${statistics.roles_con_permisos}`);

    console.log('\n🎯 Flujo de gestión implementado:');
    console.log('  1️⃣  Ver calendario → ver_calendario_planilla');
    console.log('  2️⃣  Click en fecha → ver_detalles_dia');
    console.log('  3️⃣  Modal con ventas y servicios del día');
    console.log('   4️⃣  Pagar día → pagar_dia');

    console.log('\n🔐 Implementación de calendario interactivo:');
    console.log('  - Vista de calendario con fechas interactivas/activas');
    console.log('  - Click en fecha muestra modal con detalles del día');
    console.log('  - Operaciones de pago y gestión en el modal');

    console.log('\n✅ Refinamiento del módulo detalle_planilla completado exitosamente');

  } catch (error) {
    console.error('✗ Error:', error.message);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

suggestDetallePlanillaPermissions();
