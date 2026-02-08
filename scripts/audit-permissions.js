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

async function auditPermissions() {
  let connection;
  
  try {
    connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      port: process.env.DB_PORT || 3306
    });

    console.log('🔍 AUDITORÍA COMPLETA DEL MÓDULO DE PERMISOS');
    console.log('=' .repeat(60));

    // 1. VERIFICAR ESTRUCTURA DE TABLAS
    console.log('\n📊 1. ESTRUCTURA DE TABLAS');
    
    const [tables] = await connection.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = ? 
      AND (table_name LIKE '%permission%' OR table_name LIKE '%role%')
      ORDER BY table_name
    `, [process.env.DB_NAME]);

    console.log('Tablas relacionadas con permisos y roles:');
    tables.forEach(table => {
      console.log(`  ✓ ${table.table_name}`);
    });

    // Verificar estructura de tabla permissions
    const [permColumns] = await connection.query("DESCRIBE permissions");
    console.log('\nEstructura de tabla permissions:');
    permColumns.forEach(col => {
      console.log(`  - ${col.Field} (${col.Type}) ${col.Null === 'NO' ? 'NOT NULL' : 'NULL'} ${col.Key ? `KEY ${col.Key}` : ''}`);
    });

    // Verificar estructura de tabla roles
    const [roleColumns] = await connection.query("DESCRIBE roles");
    console.log('\nEstructura de tabla roles:');
    roleColumns.forEach(col => {
      console.log(`  - ${col.Field} (${col.Type}) ${col.Null === 'NO' ? 'NOT NULL' : 'NULL'} ${col.Key ? `KEY ${col.Key}` : ''}`);
    });

    // Verificar estructura de tabla role_permissions
    try {
      const [rpColumns] = await connection.query("DESCRIBE role_permissions");
      console.log('\nEstructura de tabla role_permissions:');
      rpColumns.forEach(col => {
        console.log(`  - ${col.Field} (${col.Type}) ${col.Null === 'NO' ? 'NOT NULL' : 'NULL'} ${col.Key ? `KEY ${col.Key}` : ''}`);
      });
    } catch (error) {
      console.log('\n✗ Tabla role_permissions no existe');
    }

    // 2. VERIFICAR CONSISTENCIA DE PERMISOS
    console.log('\n🔍 2. CONSISTENCIA DE PERMISOS');
    
    const [permissions] = await connection.query(`
      SELECT module, action, COUNT(*) as count, GROUP_CONCAT(name) as names
      FROM permissions 
      GROUP BY module, action 
      HAVING count > 1
      ORDER BY module, action
    `);

    if (permissions.length > 0) {
      console.log('⚠️  Permisos duplicados encontrados:');
      permissions.forEach(perm => {
        console.log(`  - ${perm.module}.${perm.action}: ${perm.count} permisos (${perm.names})`);
      });
    } else {
      console.log('✓ No hay permisos duplicados');
    }

    // Verificar permisos sin acción o módulo
    const [invalidPerms] = await connection.query(`
      SELECT id, name, module, action 
      FROM permissions 
      WHERE module IS NULL OR module = '' OR action IS NULL OR action = ''
    `);

    if (invalidPerms.length > 0) {
      console.log('\n⚠️  Permisos con datos inválidos:');
      invalidPerms.forEach(perm => {
        console.log(`  - ID ${perm.id}: ${perm.name} (módulo: ${perm.module}, acción: ${perm.action})`);
      });
    } else {
      console.log('✓ Todos los permisos tienen módulo y acción válidos');
    }

    // 3. VERIFICAR ASIGNACIONES
    console.log('\n👥 3. ASIGNACIONES POR ROL');
    
    const [roleAssignments] = await connection.query(`
      SELECT 
        r.nombre AS rol,
        COUNT(rp.permission_id) as permisos_asignados,
        (SELECT COUNT(*) FROM permissions) as total_permisos
      FROM roles r
      LEFT JOIN role_permissions rp ON r.id_rol = rp.role_id
      GROUP BY r.id_rol, r.nombre
      ORDER BY r.nombre
    `);

    roleAssignments.forEach(assignment => {
      const porcentaje = assignment.total_permisos > 0 
        ? Math.round((assignment.permisos_asignados / assignment.total_permisos) * 100)
        : 0;
      console.log(`  - ${assignment.rol}: ${assignment.permisos_asignados}/${assignment.total_permisos} permisos (${porcentaje}%)`);
    });

    // Verificar permisos huérfanos (sin rol asignado)
    const [orphanPerms] = await connection.query(`
      SELECT p.module, p.action, p.name
      FROM permissions p
      LEFT JOIN role_permissions rp ON p.id = rp.permission_id
      WHERE rp.permission_id IS NULL
      ORDER BY p.module, p.action
    `);

    if (orphanPerms.length > 0) {
      console.log('\n⚠️  Permisos sin rol asignado:');
      orphanPerms.forEach(perm => {
        console.log(`  - ${perm.module}.${perm.action}: ${perm.name}`);
      });
    } else {
      console.log('\n✓ Todos los permisos están asignados a al menos un rol');
    }

    // 4. ANÁLISIS DE MÓDULOS
    console.log('\n📦 4. ANÁLISIS DE MÓDULOS');
    
    const [moduleStats] = await connection.query(`
      SELECT 
        module,
        COUNT(*) as total_permisos,
        GROUP_CONCAT(DISTINCT action ORDER BY action) as acciones
      FROM permissions
      GROUP BY module
      ORDER BY module
    `);

    console.log('Módulos y sus acciones:');
    moduleStats.forEach(mod => {
      const acciones = mod.acciones.split(',');
      console.log(`  - ${mod.module}: ${mod.total_permisos} permisos`);
      console.log(`    Acciones: ${acciones.join(', ')}`);
    });

    // 5. VERIFICAR INTEGRIDAD REFERENCIAL
    console.log('\n🔗 5. INTEGRIDAD REFERENCIAL');
    
    // Verificar si hay role_permissions con roles inexistentes
    const [invalidRoles] = await connection.query(`
      SELECT DISTINCT rp.role_id
      FROM role_permissions rp
      LEFT JOIN roles r ON rp.role_id = r.id_rol
      WHERE r.id_rol IS NULL
    `);

    if (invalidRoles.length > 0) {
      console.log('⚠️  Role_permissions con roles inexistentes:');
      invalidRoles.forEach(inv => {
        console.log(`  - Role ID: ${inv.role_id}`);
      });
    } else {
      console.log('✓ Todas las asignaciones tienen roles válidos');
    }

    // Verificar si hay role_permissions con permisos inexistentes
    const [invalidPerms2] = await connection.query(`
      SELECT DISTINCT rp.permission_id
      FROM role_permissions rp
      LEFT JOIN permissions p ON rp.permission_id = p.id
      WHERE p.id IS NULL
    `);

    if (invalidPerms2.length > 0) {
      console.log('⚠️  Role_permissions con permisos inexistentes:');
      invalidPerms2.forEach(inv => {
        console.log(`  - Permission ID: ${inv.permission_id}`);
      });
    } else {
      console.log('✓ Todas las asignaciones tienen permisos válidos');
    }

    // 6. RECOMENDACIONES
    console.log('\n💡 6. RECOMENDACIONES');
    
    const [totalStats] = await connection.query(`
      SELECT 
        (SELECT COUNT(*) FROM permissions) as total_permisos,
        (SELECT COUNT(*) FROM roles) as total_roles,
        (SELECT COUNT(*) FROM role_permissions) as total_asignaciones
    `);

    const stats = totalStats[0];
    const promedioPermisosPorRol = Math.round(stats.total_asignaciones / stats.total_roles);
    
    console.log(`📈 Estadísticas:`);
    console.log(`  - Total permisos: ${stats.total_permisos}`);
    console.log(`  - Total roles: ${stats.total_roles}`);
    console.log(`  - Total asignaciones: ${stats.total_asignaciones}`);
    console.log(`  - Promedio permisos/rol: ${promedioPermisosPorRol}`);

    if (orphanPerms.length > 0) {
      console.log(`\n⚠️  Se encontraron ${orphanPerms.length} permisos sin asignar. Considera asignarlos o eliminarlos.`);
    }

    if (permissions.length > 0) {
      console.log(`\n⚠️  Se encontraron ${permissions.length} permisos duplicados. Revisa la nomenclatura.`);
    }

    console.log('\n✅ Auditoría completada exitosamente');

  } catch (error) {
    console.error('✗ Error:', error.message);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

auditPermissions();
