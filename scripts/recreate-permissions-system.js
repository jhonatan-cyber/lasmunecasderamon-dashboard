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

async function recreatePermissionsSystem() {
  let connection;
  
  try {
    connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      port: process.env.DB_PORT || 3306
    });

    console.log('🔧 RECRIANDO SISTEMA DE PERMISOS DESDE CERO');
    console.log('=' .repeat(70));

    // 1. LIMPIAR TABLA DE PERMISOS COMPLETAMENTE
    console.log('\n🗑️ 1. Limpiando tabla de permisos...');
    
    // Eliminar todas las asignaciones de permisos
    const [deletedAssignments] = await connection.query("DELETE FROM role_permissions");
    console.log(`  ✓ Eliminadas ${deletedAssignments.affectedRows} asignaciones de permisos`);
    
    // Eliminar todos los permisos
    const [deletedPermissions] = await connection.query("DELETE FROM permissions");
    console.log(`  ✓ Eliminados ${deletedPermissions.affectedRows} permisos`);

    // 2. DEFINIR ESTRUCTURA BASE DE PERMISOS
    console.log('\n📋 2. Definiendo estructura base de permisos...');
    
    // Acciones base que tendrán todos los módulos
    const baseActions = ['listar', 'ver_detalles', 'crear', 'editar', 'activar', 'desactivar', 'eliminar'];
    
    // Módulos del sistema con sus acciones específicas
    const modulesConfig = {
      // Módulos estándar (con todas las acciones base)
      usuarios: baseActions,
      clientes: baseActions,
      productos: baseActions,
      categorias: baseActions,
      roles: baseActions,
      
      // Módulos con acciones específicas
      ventas: ['listar', 'ver_detalles', 'crear', 'editar', 'eliminar'],
      pedidos: ['listar', 'ver_detalles', 'crear', 'procesar', 'editar', 'eliminar'],
      caja: ['listar', 'ver_detalles', 'crear', 'cerrar', 'retirar', 'editar'],
      
      // Módulos de gestión
      habitaciones: ['listar', 'ver_detalles', 'crear', 'editar', 'activar', 'desactivar', 'eliminar', 'ver_estado'],
      servicios: ['listar', 'ver_detalles', 'crear', 'editar', 'activar', 'desactivar', 'eliminar', 'gestionar_precios'],
      inventario: ['listar', 'ver_detalles', 'crear', 'editar', 'eliminar', 'ajustar', 'ver_movimientos', 'generar_reportes'],
      
      // Módulos de reportes y finanzas
      reportes: ['ver_reportes_ventas', 'ver_reportes_caja', 'ver_reportes_clientes', 'ver_reportes_servicios', 'generar', 'exportar'],
      finanzas: ['ver_resumen', 'ver_ingresos_egresos', 'ver_flujo_caja', 'generar', 'gestionar', 'conciliar'],
      
      // Módulos de configuración
      configuracion: ['ver_configuracion', 'editar_configuracion', 'configurar_impuestos', 'configurar_metodos_pago', 'configurar_notificaciones', 'ver_logs'],
      
      // Módulos de recursos humanos
      asistencias: ['listar', 'ver_detalles', 'registrar', 'editar', 'eliminar', 'ver_reportes'],
      horas_extras: ['listar', 'ver_detalles', 'crear', 'editar', 'eliminar'],
      
      // Módulos de servicios
      solicitudes_servicios: ['listar', 'ver_detalles', 'aprobar', 'rechazar'],
      
      // Módulo de permisos
      permissions: ['ver', 'crear', 'editar', 'eliminar']
    };

    console.log('Módulos configurados:');
    Object.keys(modulesConfig).forEach(module => {
      console.log(`  - ${module}: ${modulesConfig[module].length} acciones`);
    });

    // 3. CREAR TODOS LOS PERMISOS
    console.log('\n➕ 3. Creando todos los permisos...');
    
    let totalCreated = 0;
    const permissionIds = {};
    
    for (const [module, actions] of Object.entries(modulesConfig)) {
      console.log(`\n  📦 Creando permisos para módulo: ${module}`);
      
      permissionIds[module] = {};
      
      for (const action of actions) {
        try {
          const permissionName = `${action}_${module}`;
          const description = generateDescription(module, action);
          
          const [result] = await connection.query(
            `INSERT INTO permissions (name, description, module, action) 
             VALUES (?, ?, ?, ?)`,
            [permissionName, description, module, action]
          );
          
          permissionIds[module][action] = result.insertId;
          console.log(`    ✓ ${action}: ${permissionName} (ID: ${result.insertId})`);
          totalCreated++;
          
        } catch (error) {
          console.log(`    ✗ Error creando ${action}_${module}: ${error.message}`);
        }
      }
    }

    console.log(`\n  ✅ Total de permisos creados: ${totalCreated}`);

    // 4. OBTENER ROLES DEL SISTEMA
    console.log('\n👥 4. Obteniendo roles del sistema...');
    
    const [roles] = await connection.query("SELECT id_rol, nombre FROM roles ORDER BY nombre");
    const roleMap = {};
    
    roles.forEach(role => {
      roleMap[role.nombre.toLowerCase()] = role.id_rol;
      console.log(`  - ${role.nombre}: ID ${role.id_rol}`);
    });

    // 5. ASIGNAR PERMISOS A ROLES
    console.log('\n🔐 5. Asignando permisos a roles...');
    
    let totalAssignments = 0;
    
    // Definir permisos por rol
    const rolePermissions = {
      administrador: {
        // Administrador NO necesita permisos explícitos - tiene acceso completo por rol
        // Solo asignamos permisos para consistencia en la interfaz, pero el sistema debe bypassear para admin
        permissions: ['ver', 'crear', 'editar', 'eliminar'] // Solo para mostrar en la interfaz de gestión
      },
      
      cajero: {
        usuarios: ['listar', 'ver_detalles', 'editar'],
        clientes: ['listar', 'ver_detalles', 'crear', 'editar'],
        pedidos: ['listar', 'ver_detalles', 'crear', 'procesar'],
        ventas: ['listar', 'ver_detalles', 'crear'],
        caja: ['listar', 'ver_detalles', 'crear', 'cerrar', 'retirar'],
        reportes: ['ver_reportes_ventas', 'ver_reportes_caja', 'generar']
      },
      
      anfitriona: {
        usuarios: ['listar', 'ver_detalles', 'crear'],
        clientes: ['listar', 'ver_detalles', 'crear', 'editar'],
        pedidos: ['listar', 'ver_detalles', 'procesar'],
        habitaciones: ['listar', 'ver_detalles', 'ver_estado', 'editar'],
        servicios: ['listar', 'ver_detalles', 'activar', 'desactivar'],
        solicitudes_servicios: ['listar', 'aprobar', 'rechazar'],
        reportes: ['ver_reportes_servicios']
      },
      
      garzon: {
        usuarios: ['listar', 'ver_detalles'],
        clientes: ['listar', 'ver_detalles', 'crear', 'editar'],
        pedidos: ['listar', 'ver_detalles', 'crear'],
        productos: ['listar', 'ver_detalles'],
        categorias: ['listar', 'ver_detalles']
      }
    };

    for (const [roleName, modules] of Object.entries(rolePermissions)) {
      const roleId = roleMap[roleName];
      if (!roleId) {
        console.log(`  ⚠️  Rol no encontrado: ${roleName}`);
        continue;
      }

      console.log(`\n  🔑 Asignando permisos a: ${roleName}`);
      let roleAssignmentCount = 0;

      for (const [module, actions] of Object.entries(modules)) {
        if (!permissionIds[module]) {
          console.log(`    ⚠️  Módulo no encontrado: ${module}`);
          continue;
        }

        for (const action of actions) {
          const permissionId = permissionIds[module][action];
          if (permissionId) {
            try {
              await connection.query(
                "INSERT INTO role_permissions (role_id, permission_id) VALUES (?, ?)",
                [roleId, permissionId]
              );
              roleAssignmentCount++;
              totalAssignments++;
            } catch (error) {
              console.log(`      ✗ Error asignando ${action}_${module}: ${error.message}`);
            }
          } else {
            console.log(`      ⚠️  Permiso no encontrado: ${action}_${module}`);
          }
        }
      }

      console.log(`    ✓ ${roleAssignmentCount} permisos asignados`);
    }

    // 6. VERIFICACIÓN FINAL
    console.log('\n✅ 6. Verificación final del sistema...');
    
    const [finalStats] = await connection.query(`
      SELECT 
        COUNT(DISTINCT p.id) as total_permisos,
        COUNT(DISTINCT p.module) as total_modulos,
        COUNT(DISTINCT rp.role_id) as roles_con_permisos,
        COUNT(rp.permission_id) as total_asignaciones
      FROM permissions p
      LEFT JOIN role_permissions rp ON p.id = rp.permission_id
    `);

    const stats = finalStats[0];
    console.log('\n📊 Estadísticas finales:');
    console.log(`  - Total permisos: ${stats.total_permisos}`);
    console.log(`  - Total módulos: ${stats.total_modulos}`);
    console.log(`  - Roles con permisos: ${stats.roles_con_permisos}`);
    console.log(`  - Total asignaciones: ${stats.total_asignaciones}`);

    // 7. RESUMEN POR MÓDULO
    console.log('\n📋 Resumen por módulo:');
    const [moduleSummary] = await connection.query(`
      SELECT 
        p.module,
        COUNT(DISTINCT p.id) as permisos_modulo,
        COUNT(DISTINCT rp.role_id) as roles_con_acceso,
        GROUP_CONCAT(DISTINCT r.nombre) as roles
      FROM permissions p
      LEFT JOIN role_permissions rp ON p.id = rp.permission_id
      LEFT JOIN roles r ON rp.role_id = r.id_rol
      GROUP BY p.module
      ORDER BY p.module
    `);

    moduleSummary.forEach(mod => {
      const roles = mod.roles ? mod.roles.split(',') : ['Sin acceso'];
      console.log(`  📦 ${mod.module}:`);
      console.log(`    - Permisos: ${mod.permisos_modulo}`);
      console.log(`    - Roles con acceso: ${mod.roles_con_acceso}`);
      console.log(`    - Roles: ${roles.join(', ')}`);
      console.log('');
    });

    console.log('\n✅ Sistema de permisos recreado exitosamente desde cero');
    console.log('\n🎯 El sistema ahora tiene una estructura consistente y bien organizada');

  } catch (error) {
    console.error('✗ Error:', error.message);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

// Función para generar descripciones consistentes
function generateDescription(module, action) {
  const descriptions = {
    listar: `Acceso al listado de ${module}`,
    ver_detalles: `Ver detalles específicos de ${module}`,
    crear: `Crear nuevos ${module} en el sistema`,
    editar: `Editar información de ${module}`,
    activar: `Activar ${module} desactivados`,
    desactivar: `Desactivar ${module} existentes`,
    eliminar: `Eliminar ${module} del sistema`,
    procesar: `Procesar ${module}`,
    cerrar: `Cerrar ${module}`,
    retirar: `Retirar dinero de ${module}`,
    ver_estado: `Ver estado actual de ${module}`,
    gestionar_precios: `Gestionar precios de ${module}`,
    ajustar: `Ajustar existencias de ${module}`,
    ver_movimientos: `Ver movimientos de ${module}`,
    generar_reportes: `Generar reportes de ${module}`,
    ver_reportes_ventas: `Ver reportes de ventas`,
    ver_reportes_caja: `Ver reportes de caja`,
    ver_reportes_clientes: `Ver reportes de clientes`,
    ver_reportes_servicios: `Ver reportes de servicios`,
    generar: `Generar reportes`,
    exportar: `Exportar reportes`,
    ver_resumen: `Ver resumen financiero`,
    ver_ingresos_egresos: `Ver ingresos y egresos`,
    ver_flujo_caja: `Ver flujo de caja`,
    gestionar: `Gestionar finanzas`,
    conciliar: `Conciliar cuentas`,
    ver_configuracion: `Ver configuración del sistema`,
    editar_configuracion: `Editar configuración del sistema`,
    configurar_impuestos: `Configurar tasas de impuestos`,
    configurar_metodos_pago: `Configurar métodos de pago`,
    configurar_notificaciones: `Configurar notificaciones`,
    ver_logs: `Ver logs del sistema`,
    registrar: `Registrar ${module}`,
    ver_reportes: `Ver reportes de ${module}`,
    aprobar: `Aprobar ${module}`,
    rechazar: `Rechazar ${module}`,
    ver: `Ver ${module}`
  };

  return descriptions[action] || `${action} ${module}`;
}

recreatePermissionsSystem();
