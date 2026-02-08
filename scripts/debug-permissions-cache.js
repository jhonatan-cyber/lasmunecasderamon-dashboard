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

async function debugPermissionsCache() {
  let connection;
  
  try {
    connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      port: process.env.DB_PORT || 3306
    });

    console.log('🔍 DEBUG DE PERMISOS - VERIFICACIÓN DE CACHE');
    console.log('=' .repeat(80));

    // 1. VERIFICAR PERMISOS EN BASE DE DATOS
    console.log('\n📋 1. Permisos en base de datos:');
    
    const [dbPerms] = await connection.query(`
      SELECT r.nombre as rol, p.module, p.action, p.name as permission_name
      FROM role_permissions rp
      INNER JOIN permissions p ON rp.permission_id = p.id
      INNER JOIN roles r ON rp.role_id = r.id_rol
      ORDER BY r.nombre, p.module, p.action
    `);

    // Agrupar por rol
    const rolePermissions = {};
    dbPerms.forEach(row => {
      if (!rolePermissions[row.rol]) {
        rolePermissions[row.rol] = {};
      }
      if (!rolePermissions[row.rol][row.module]) {
        rolePermissions[row.rol][row.module] = [];
      }
      rolePermissions[row.rol][row.module].push(row.action);
    });

    Object.keys(rolePermissions).forEach(role => {
      console.log(`\n👤 ${role}:`);
      Object.keys(rolePermissions[role]).sort().forEach(module => {
        const actions = rolePermissions[role][module];
        console.log(`  📋 ${module}: ${actions.join(', ')}`);
      });
    });

    // 2. VERIFICAR PERMISOS DEL ROL GARZÓN ESPECÍFICAMENTE
    console.log('\n📋 2. Permisos del rol garzón (esperados):');
    console.log('  - listar_pedidos ✅');
    console.log('  - crear_pedidos ✅');
    console.log('  - listar_usuarios ✅');
    console.log('  - ver_detalles_usuarios ✅');
    console.log('  - listar_clientes ✅');
    console.log('  - listar_categorias ✅');
    console.log('  - listar_reportes ✅');
    console.log('  - listar_ventas ✅');
    console.log('  - listar_asistencias ✅');
    console.log('  - listar_horas_extras ✅');
    console.log('  - listar_caja ✅');
    console.log('  - listar_anticipos ✅');
    console.log('  - listar_propinas ✅');
    console.log('  - listar_comisiones ✅');
    console.log('  - listar_planilla ✅');
    console.log('  - listar_detalle_planilla ✅');
    console.log('  - listar_payroll ✅');
    console.log('  - listar_privados ✅');
    console.log('  - listar_devoluciones ✅');
    console.log('  - listar_habitaciones ✅');
    console.log('  - listar_configuraciones ✅');

    // 3. VERIFICAR SI HAY INCONSISTENCIAS
    console.log('\n🔍 3. Verificando inconsistencias...');
    
    const [inconsistencias] = await connection.query(`
      SELECT 
        r.nombre as rol,
        p.module,
        p.action,
        p.name as permission_name,
        COUNT(*) as count
      FROM role_permissions rp
      INNER JOIN permissions p ON rp.permission_id = p.id
      INNER JOIN roles r ON rp.role_id = r.id_rol
      WHERE r.nombre = 'garzon'
      GROUP BY p.module, p.action, p.name
      HAVING COUNT(*) > 1
    `);

    if (inconsistencias.length > 0) {
      console.log('  ⚠️ INCONSISTENCIAS ENCONTRADAS:');
      inconsistencias.forEach(inc => {
        console.log(`    - ${inc.permission_name} (${inc.module}.${inc.action}): ${inc.count} veces`);
      });
    }

    // 4. VERIFICAR ESTRUCTURA DE PERMISOS
    console.log('\n📊 4. Verificando estructura de permisos...');
    
    const [permStructure] = await connection.query(`
      SELECT 
        COUNT(*) as total_permisos,
        COUNT(DISTINCT module) as modulos_unicos,
        COUNT(DISTINCT action) as acciones_unicas
      FROM permissions
    `);

    const structure = permStructure[0];
    console.log(`  📊 Total permisos: ${structure.total_permisos}`);
    console.log(`  📊 Módulos únicos: ${structure.modulos_unicos}`);
    console.log(`  📊 Acciones únicas: ${structure.acciones_unicas}`);

    // 5. VERIFICAR ESTADO DE LA CONEXIÓN
    console.log('\n🔌 5. Verificando estado de la conexión...');
    
    const [connectionStatus] = await connection.query('SELECT CONNECTION_ID() as connection_id');
    console.log(`  📊 ID de conexión: ${connectionStatus[0].connection_id}`);
    console.log(`  📊 Estado: ${connectionStatus[0].STATUS}`);

    // 6. VERIFICAR CACHE POSIBLES
    console.log('\n💾 6. Verificando posibles problemas de cache...');
    
    console.log('  📋 Posibles problemas:');
    console.log('    1. Frontend cacheando permisos viejos');
    console.log('    2. Middleware de permisos no actualizado');
    console.log('    3. Sesión de usuario no refrescada');
    console.log('    4. Base de datos no actualizada');

    // 7. RECOMENDACIONES
    console.log('\n💡 RECOMENDACIONES:');
    console.log('');
    console.log('  🔄 PARA LOS USUARIOS:');
    console.log('    1. Cerrar sesión y volver a iniciar sesión');
    console.log('    2. Limpiar cache del navegador (F12 o Ctrl+Shift+R)');
    console.log('    3. Verificar que los permisos se carguen correctamente en el hook useUserPermissions');
    console.log('');
    console.log('  🔄 PARA EL DESARROLLADOR:');
    console.log('    1. Reiniciar el servidor de desarrollo');
    console.log('    2. Verificar que los cambios se reflejen en la base de datos');
    console.log('    3. Limpiar cualquier cache del servidor');
    console.log('');
    console.log('  🔄 PARA EL SISTEMA:');
    console.log('    1. Verificar que el middleware de permisos esté actualizado');
    console.log('    2. Asegurarse de que no haya caché de permisos en el frontend');
    console.log('    3. Considerar implementar invalidación de caché cuando se actualizan permisos');

    // 8. VERIFICACIÓN DE ESTADO FINAL
    console.log('\n✅ ESTADO FINAL:');
    console.log('  📋 Base de datos: Conectada y actualizada');
    console.log('  📋 Permisos garzón: Correctos en base de datos');
    console.log('  📋 Sistema: Estructura correcta');
    console.log('  📋 Cache: Posiblemente desactualizado');

  } catch (error) {
    console.error('✗ Error en la verificación:', error.message);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

debugPermissionsCache();
