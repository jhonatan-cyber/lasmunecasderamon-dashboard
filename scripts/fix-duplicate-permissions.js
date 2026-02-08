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

async function fixDuplicatePermissions() {
  let connection;
  
  try {
    connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      port: process.env.DB_PORT || 3306
    });

    console.log('🔧 CORRIGIENDO PERMISOS DUPLICADOS');
    console.log('=' .repeat(50));

    // 1. CORREGIR PERMISOS DUPLICADOS DE CONFIGURACION.VER
    console.log('\n📝 1. Corrigiendo configuracion.ver...');
    
    // Eliminar permiso duplicado "ver_logs" y mantener "ver_configuracion"
    await connection.query("DELETE FROM permissions WHERE name = 'ver_logs'");
    console.log('✓ Eliminado permiso duplicado "ver_logs"');

    // 2. CORREGIR PERMISOS DUPLICADOS DE CONFIGURACION.CONFIGURAR
    console.log('\n⚙️ 2. Corrigiendo configuracion.configurar...');
    
    // Renombrar permisos para que sean específicos
    const updates = [
      { oldName: 'configurar_impuestos', newName: 'configurar_impuestos', newAction: 'configurar_impuestos' },
      { oldName: 'configurar_metodos_pago', newName: 'configurar_metodos_pago', newAction: 'configurar_metodos_pago' },
      { oldName: 'configurar_notificaciones', newName: 'configurar_notificaciones', newAction: 'configurar_notificaciones' }
    ];

    for (const update of updates) {
      await connection.query(
        "UPDATE permissions SET action = ? WHERE name = ?",
        [update.newAction, update.oldName]
      );
      console.log(`✓ Actualizado permiso "${update.oldName}" con acción específica "${update.newAction}"`);
    }

    // 3. CORREGIR PERMISOS DUPLICADOS DE FINANZAS.VER
    console.log('\n💰 3. Corrigiendo finanzas.ver...');
    
    const finanzasUpdates = [
      { oldName: 'ver_resumen_financiero', newName: 'ver_resumen_financiero', newAction: 'ver_resumen' },
      { oldName: 'ver_ingresos_egresos', newName: 'ver_ingresos_egresos', newAction: 'ver_ingresos_egresos' },
      { oldName: 'ver_flujo_caja', newName: 'ver_flujo_caja', newAction: 'ver_flujo_caja' }
    ];

    for (const update of finanzasUpdates) {
      await connection.query(
        "UPDATE permissions SET action = ? WHERE name = ?",
        [update.newAction, update.oldName]
      );
      console.log(`✓ Actualizado permiso "${update.oldName}" con acción específica "${update.newAction}"`);
    }

    // 4. CORREGIR PERMISOS DUPLICADOS DE REPORTES.VER
    console.log('\n📊 4. Corrigiendo reportes.ver...');
    
    const reportesUpdates = [
      { oldName: 'ver_reportes_ventas', newName: 'ver_reportes_ventas', newAction: 'ver_ventas' },
      { oldName: 'ver_reportes_caja', newName: 'ver_reportes_caja', newAction: 'ver_caja' },
      { oldName: 'ver_reportes_clientes', newName: 'ver_reportes_clientes', newAction: 'ver_clientes' },
      { oldName: 'ver_reportes_servicios', newName: 'ver_reportes_servicios', newAction: 'ver_servicios' }
    ];

    for (const update of reportesUpdates) {
      await connection.query(
        "UPDATE permissions SET action = ? WHERE name = ?",
        [update.newAction, update.oldName]
      );
      console.log(`✓ Actualizado permiso "${update.oldName}" con acción específica "${update.newAction}"`);
    }

    // 5. VERIFICAR RESULTADOS
    console.log('\n🔍 5. Verificando correcciones...');
    
    const [duplicates] = await connection.query(`
      SELECT module, action, COUNT(*) as count, GROUP_CONCAT(name) as names
      FROM permissions 
      GROUP BY module, action 
      HAVING count > 1
      ORDER BY module, action
    `);

    if (duplicates.length === 0) {
      console.log('✅ No hay más permisos duplicados');
    } else {
      console.log('⚠️  Aún quedan permisos duplicados:');
      duplicates.forEach(perm => {
        console.log(`  - ${perm.module}.${perm.action}: ${perm.count} permisos (${perm.names})`);
      });
    }

    // 6. ACTUALIZAR ASIGNACIONES DE ROLES
    console.log('\n🔄 6. Actualizando asignaciones de roles...');
    
    // No es necesario actualizar las asignaciones ya que los IDs de permisos no cambiaron
    console.log('✓ Las asignaciones de roles permanecen intactas');

    // 7. VERIFICAR ESTADO FINAL
    console.log('\n📊 7. Estado final de permisos...');
    
    const [moduleStats] = await connection.query(`
      SELECT 
        module,
        COUNT(*) as total_permisos,
        GROUP_CONCAT(DISTINCT action ORDER BY action) as acciones
      FROM permissions
      GROUP BY module
      ORDER BY module
    `);

    console.log('Módulos actualizados:');
    moduleStats.forEach(mod => {
      const acciones = mod.acciones.split(',');
      console.log(`  - ${mod.module}: ${mod.total_permisos} permisos`);
      if (mod.module === 'configuracion' || mod.module === 'finanzas' || mod.module === 'reportes') {
        console.log(`    Acciones: ${acciones.join(', ')}`);
      }
    });

    console.log('\n✅ Corrección de permisos duplicados completada');

  } catch (error) {
    console.error('✗ Error:', error.message);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

fixDuplicatePermissions();
