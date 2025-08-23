// Script para verificar y corregir permisos de pedidos
const mysql = require('mysql2/promise');

// Configuración de la base de datos
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'nuwesoft',
  port: parseInt(process.env.DB_PORT || '3307')
};

async function query(sql, params = []) {
  const connection = await mysql.createConnection(dbConfig);
  try {
    const [rows] = await connection.execute(sql, params);
    return rows;
  } finally {
    await connection.end();
  }
}

async function checkAndFixPermissions() {
  console.log('🔍 Verificando permisos de pedidos...');

  try {
    // 1. Verificar permisos existentes
    console.log('\n📋 Permisos existentes:');
    const permissions = await query(`
      SELECT id, name, module, action 
      FROM permissions 
      WHERE module IN ('orders', 'pedidos') 
      ORDER BY module, action
    `);
    
    permissions.forEach(perm => {
      console.log(`   ${perm.module}.${perm.action}: ${perm.name}`);
    });

    // 2. Verificar permisos de roles
    console.log('\n👥 Permisos por rol:');
    const rolePermissions = await query(`
      SELECT r.nombre as rol, p.module, p.action, p.name
      FROM role_permissions rp
      INNER JOIN roles r ON rp.role_id = r.id_rol
      INNER JOIN permissions p ON rp.permission_id = p.id
      WHERE p.module IN ('orders', 'pedidos')
      ORDER BY r.nombre, p.module, p.action
    `);
    
    rolePermissions.forEach(rp => {
      console.log(`   ${rp.rol}: ${rp.module}.${rp.action} - ${rp.name}`);
    });

    // 3. Verificar si existe el permiso 'orders.process'
    const orderProcessPerm = await query(`
      SELECT id FROM permissions 
      WHERE module = 'orders' AND action = 'process'
    `);

    if (orderProcessPerm.length === 0) {
      console.log('\n❌ Permiso "orders.process" no encontrado');
      console.log('📝 Creando permiso "orders.process"...');
      
      await query(`
        INSERT INTO permissions (name, description, module, action) 
        VALUES ('Procesar pedidos', 'Acceso para procesar y gestionar pedidos', 'orders', 'process')
      `);
      
      console.log('✅ Permiso "orders.process" creado');
    } else {
      console.log('\n✅ Permiso "orders.process" ya existe');
    }

    // 4. Verificar si los roles tienen el permiso 'orders.process'
    const roles = await query('SELECT id_rol, nombre FROM roles WHERE estado = 1');
    
    for (const role of roles) {
      const hasPermission = await query(`
        SELECT COUNT(*) as count
        FROM role_permissions rp
        INNER JOIN permissions p ON rp.permission_id = p.id
        WHERE rp.role_id = ? AND p.module = 'orders' AND p.action = 'process'
      `, [role.id_rol]);
      
      if (hasPermission[0].count === 0) {
        console.log(`❌ Rol "${role.nombre}" no tiene permiso "orders.process"`);
        
        // Obtener el ID del permiso
        const permId = await query(`
          SELECT id FROM permissions 
          WHERE module = 'orders' AND action = 'process'
        `);
        
        if (permId.length > 0) {
          console.log(`📝 Asignando permiso "orders.process" al rol "${role.nombre}"...`);
          
          await query(`
            INSERT INTO role_permissions (role_id, permission_id) 
            VALUES (?, ?)
          `, [role.id_rol, permId[0].id]);
          
          console.log(`✅ Permiso asignado al rol "${role.nombre}"`);
        }
      } else {
        console.log(`✅ Rol "${role.nombre}" ya tiene permiso "orders.process"`);
      }
    }

    console.log('\n🎉 Verificación de permisos completada');

  } catch (error) {
    console.error('❌ Error verificando permisos:', error);
    console.error('❌ Detalles del error:', {
      message: error.message,
      code: error.code,
      errno: error.errno
    });
  }
}

// Ejecutar verificación
checkAndFixPermissions();
