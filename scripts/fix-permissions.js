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

async function fixPermissions() {
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

    // 1. ELIMINAR PERMISOS DUPLICADOS
    console.log('\n🧹 Limpiando permisos duplicados...');
    
    // Eliminar permisos de 'clients' (duplicado de 'clientes')
    await connection.query("DELETE FROM permissions WHERE module = 'clients'");
    console.log('✓ Eliminados permisos del módulo "clients"');
    
    // Eliminar permisos de 'orders' (duplicado de 'pedidos')
    await connection.query("DELETE FROM permissions WHERE module = 'orders'");
    console.log('✓ Eliminados permisos del módulo "orders"');

    // 2. AGREGAR NUEVOS MÓDULOS Y PERMISOS
    console.log('\n📦 Agregando nuevos módulos y permisos...');
    
    const newModules = [
      {
        module: 'reportes',
        permissions: [
          { name: 'ver_reportes_ventas', description: 'Ver reportes de ventas', action: 'ver' },
          { name: 'ver_reportes_caja', description: 'Ver reportes de caja', action: 'ver' },
          { name: 'ver_reportes_clientes', description: 'Ver reportes de clientes', action: 'ver' },
          { name: 'ver_reportes_servicios', description: 'Ver reportes de servicios', action: 'ver' },
          { name: 'generar_reportes', description: 'Generar reportes personalizados', action: 'generar' },
          { name: 'exportar_reportes', description: 'Exportar reportes a Excel/PDF', action: 'exportar' }
        ]
      },
      {
        module: 'configuracion',
        permissions: [
          { name: 'ver_configuracion', description: 'Ver configuración del sistema', action: 'ver' },
          { name: 'editar_configuracion', description: 'Editar configuración del sistema', action: 'editar' },
          { name: 'configurar_impuestos', description: 'Configurar tasas de impuestos', action: 'configurar' },
          { name: 'configurar_metodos_pago', description: 'Configurar métodos de pago', action: 'configurar' },
          { name: 'configurar_notificaciones', description: 'Configurar notificaciones', action: 'configurar' },
          { name: 'ver_logs', description: 'Ver logs del sistema', action: 'ver' }
        ]
      },
      {
        module: 'habitaciones',
        permissions: [
          { name: 'ver_habitaciones', description: 'Ver habitaciones', action: 'ver' },
          { name: 'crear_habitaciones', description: 'Crear habitaciones', action: 'crear' },
          { name: 'editar_habitaciones', description: 'Editar habitaciones', action: 'editar' },
          { name: 'eliminar_habitaciones', description: 'Eliminar habitaciones', action: 'eliminar' },
          { name: 'activar_habitaciones', description: 'Activar habitaciones', action: 'activar' },
          { name: 'desactivar_habitaciones', description: 'Desactivar habitaciones', action: 'desactivar' },
          { name: 'ver_estado_habitaciones', description: 'Ver estado de habitaciones', action: 'ver_estado' }
        ]
      },
      {
        module: 'servicios',
        permissions: [
          { name: 'ver_servicios', description: 'Ver servicios', action: 'ver' },
          { name: 'crear_servicios', description: 'Crear servicios', action: 'crear' },
          { name: 'editar_servicios', description: 'Editar servicios', action: 'editar' },
          { name: 'eliminar_servicios', description: 'Eliminar servicios', action: 'eliminar' },
          { name: 'activar_servicios', description: 'Activar servicios', action: 'activar' },
          { name: 'desactivar_servicios', description: 'Desactivar servicios', action: 'desactivar' },
          { name: 'gestionar_precios_servicios', description: 'Gestionar precios de servicios', action: 'gestionar_precios' }
        ]
      },
      {
        module: 'inventario',
        permissions: [
          { name: 'ver_inventario', description: 'Ver inventario', action: 'ver' },
          { name: 'crear_productos_inventario', description: 'Crear productos en inventario', action: 'crear' },
          { name: 'editar_inventario', description: 'Editar inventario', action: 'editar' },
          { name: 'eliminar_inventario', description: 'Eliminar del inventario', action: 'eliminar' },
          { name: 'ajustar_stock', description: 'Ajustar stock de productos', action: 'ajustar' },
          { name: 'ver_movimientos_inventario', description: 'Ver movimientos de inventario', action: 'ver_movimientos' },
          { name: 'generar_reportes_inventario', description: 'Generar reportes de inventario', action: 'generar_reportes' }
        ]
      },
      {
        module: 'finanzas',
        permissions: [
          { name: 'ver_resumen_financiero', description: 'Ver resumen financiero', action: 'ver' },
          { name: 'ver_ingresos_egresos', description: 'Ver ingresos y egresos', action: 'ver' },
          { name: 'gestionar_gastos', description: 'Gestionar gastos', action: 'gestionar' },
          { name: 'ver_flujo_caja', description: 'Ver flujo de caja', action: 'ver' },
          { name: 'generar_reportes_financieros', description: 'Generar reportes financieros', action: 'generar' },
          { name: 'conciliar_cuentas', description: 'Conciliar cuentas', action: 'conciliar' }
        ]
      },
      {
        module: 'asistencias',
        permissions: [
          { name: 'ver_asistencias', description: 'Ver registro de asistencias', action: 'ver' },
          { name: 'registrar_asistencia', description: 'Registrar asistencia', action: 'registrar' },
          { name: 'editar_asistencia', description: 'Editar asistencia', action: 'editar' },
          { name: 'eliminar_asistencia', description: 'Eliminar registro de asistencia', action: 'eliminar' },
          { name: 'ver_reportes_asistencia', description: 'Ver reportes de asistencia', action: 'ver_reportes' }
        ]
      }
    ];

    // Insertar nuevos permisos
    for (const moduleData of newModules) {
      for (const perm of moduleData.permissions) {
        await connection.query(
          `INSERT IGNORE INTO permissions (name, description, module, action) 
           VALUES (?, ?, ?, ?)`,
          [perm.name, perm.description, moduleData.module, perm.action]
        );
      }
      console.log(`✓ Agregados permisos del módulo "${moduleData.module}"`);
    }

    // 3. ASIGNAR PERMISOS A ROLES
    console.log('\n👥 Asignando permisos a roles...');
    
    // Obtener IDs de roles
    const [roles] = await connection.query("SELECT id_rol, nombre FROM roles");
    const roleMap = {};
    roles.forEach(role => {
      roleMap[role.nombre.toLowerCase()] = role.id_rol;
    });

    // Asignar permisos por rol
    const roleAssignments = {
      'administrador': '*', // Todos los permisos
      'cajero': [
        'caja.ver', 'caja.crear', 'caja.cerrar', 'caja.retirar', 'caja.detalles',
        'clientes.ver', 'clientes.crear', 'clientes.editar',
        'pedidos.ver', 'pedidos.crear', 'pedidos.procesar',
        'ventas.ver', 'ventas.crear',
        'reportes.ver_reportes_ventas', 'reportes.ver_reportes_caja',
        'reportes.generar_reportes', 'reportes.exportar_reportes'
      ],
      'anfitriona': [
        'habitaciones.ver', 'habitaciones.ver_estado',
        'servicios.ver', 'servicios.activar', 'servicios.desactivar',
        'clientes.ver', 'clientes.crear',
        'pedidos.ver', 'pedidos.procesar',
        'solicitudes-servicios.aprobar', 'solicitudes-servicios.rechazar'
      ],
      'garzon': [
        'clientes.ver', 'clientes.crear',
        'pedidos.ver', 'pedidos.crear',
        'habitaciones.ver',
        'servicios.ver'
      ]
    };

    for (const [roleName, permissions] of Object.entries(roleAssignments)) {
      const roleId = roleMap[roleName];
      if (!roleId) continue;

      if (permissions === '*') {
        // Administrador: todos los permisos
        const [allPerms] = await connection.query("SELECT id FROM permissions");
        for (const perm of allPerms) {
          await connection.query(
            `INSERT IGNORE INTO role_permissions (role_id, permission_id) 
             VALUES (?, ?)`,
            [roleId, perm.id]
          );
        }
        console.log(`✓ Asignados todos los permisos a "${roleName}"`);
      } else {
        // Otros roles: permisos específicos
        for (const permName of permissions) {
          const [perm] = await connection.query(
            "SELECT id FROM permissions WHERE name = ?",
            [permName]
          );
          if (perm.length > 0) {
            await connection.query(
              `INSERT IGNORE INTO role_permissions (role_id, permission_id) 
               VALUES (?, ?)`,
              [roleId, perm[0].id]
            );
          }
        }
        console.log(`✓ Asignados permisos específicos a "${roleName}"`);
      }
    }

    // 4. VERIFICACIÓN FINAL
    console.log('\n📊 Verificación final...');
    
    const [finalModules] = await connection.query(
      "SELECT DISTINCT module FROM permissions ORDER BY module"
    );
    
    console.log('\n📦 Módulos finales configurados:');
    finalModules.forEach(mod => {
      console.log(`  - ${mod.module}`);
    });

    const [finalRoles] = await connection.query(`
      SELECT r.nombre, COUNT(rp.permission_id) as perm_count
      FROM roles r
      LEFT JOIN role_permissions rp ON r.id_rol = rp.role_id
      GROUP BY r.id_rol, r.nombre
      ORDER BY r.nombre
    `);

    console.log('\n👥 Roles y cantidad de permisos:');
    finalRoles.forEach(role => {
      console.log(`  - ${role.nombre}: ${role.perm_count} permisos`);
    });

    console.log('\n✅ ¡Sistema de permisos actualizado exitosamente!');

  } catch (error) {
    console.error('✗ Error:', error.message);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

fixPermissions();
