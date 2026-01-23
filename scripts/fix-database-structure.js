const mysql = require('mysql2/promise');
require('dotenv').config();

const config = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'nuwesoft',
  port: parseInt(process.env.DB_PORT || '3307')
};

async function fixDatabaseStructure() {
  let connection;
  
  try {
    console.log('🔧 Iniciando reparación de la estructura de la base de datos...\n');
    
    connection = await mysql.createConnection(config);
    console.log('✅ Conexión establecida\n');
    
    // 1. Crear tabla caja
    console.log('1. Creando tabla caja...');
    try {
      await connection.execute(`
        CREATE TABLE IF NOT EXISTS caja (
          id_caja INT AUTO_INCREMENT PRIMARY KEY,
          estado TINYINT DEFAULT 1 COMMENT '1=abierta, 0=cerrada',
          fecha_apertura DATETIME DEFAULT CURRENT_TIMESTAMP,
          fecha_cierre DATETIME NULL,
          monto_inicial DECIMAL(10,2) DEFAULT 0.00,
          monto_actual DECIMAL(10,2) DEFAULT 0.00,
          usuario_apertura INT,
          usuario_cierre INT NULL,
          observaciones TEXT NULL,
          fecha_crea DATETIME DEFAULT CURRENT_TIMESTAMP,
          fecha_modifica DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          INDEX idx_estado (estado),
          INDEX idx_fecha_apertura (fecha_apertura)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `);
      console.log('✅ Tabla caja creada exitosamente');
    } catch (error) {
      console.log(`❌ Error creando tabla caja: ${error.message}`);
    }
    
    // 2. Agregar columna status a usuarios si no existe
    console.log('\n2. Verificando columna status en usuarios...');
    try {
      await connection.execute(`
        ALTER TABLE usuarios 
        ADD COLUMN IF NOT EXISTS status TINYINT DEFAULT 1 COMMENT '1=activo, 0=inactivo'
      `);
      console.log('✅ Columna status agregada a usuarios');
    } catch (error) {
      console.log(`❌ Error agregando status a usuarios: ${error.message}`);
    }
    
    // 3. Agregar columna status a clientes si no existe
    console.log('\n3. Verificando columna status en clientes...');
    try {
      await connection.execute(`
        ALTER TABLE clientes 
        ADD COLUMN IF NOT EXISTS status TINYINT DEFAULT 1 COMMENT '1=activo, 0=inactivo'
      `);
      console.log('✅ Columna status agregada a clientes');
    } catch (error) {
      console.log(`❌ Error agregando status a clientes: ${error.message}`);
    }
    
    // 4. Agregar columna status a categorias si no existe
    console.log('\n4. Verificando columna status en categorias...');
    try {
      await connection.execute(`
        ALTER TABLE categorias 
        ADD COLUMN IF NOT EXISTS status TINYINT DEFAULT 1 COMMENT '1=activo, 0=inactivo'
      `);
      console.log('✅ Columna status agregada a categorias');
    } catch (error) {
      console.log(`❌ Error agregando status a categorias: ${error.message}`);
    }
    
    // 5. Crear tabla permisos
    console.log('\n5. Creando tabla permisos...');
    try {
      await connection.execute(`
        CREATE TABLE IF NOT EXISTS permisos (
          id_permiso INT AUTO_INCREMENT PRIMARY KEY,
          modulo VARCHAR(50) NOT NULL,
          accion VARCHAR(50) NOT NULL,
          nombre VARCHAR(100) NOT NULL,
          descripcion TEXT NULL,
          fecha_crea DATETIME DEFAULT CURRENT_TIMESTAMP,
          UNIQUE KEY unique_modulo_accion (modulo, accion)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `);
      console.log('✅ Tabla permisos creada exitosamente');
    } catch (error) {
      console.log(`❌ Error creando tabla permisos: ${error.message}`);
    }
    
    // 6. Crear tabla rol_permisos
    console.log('\n6. Creando tabla rol_permisos...');
    try {
      await connection.execute(`
        CREATE TABLE IF NOT EXISTS rol_permisos (
          id_rol_permiso INT AUTO_INCREMENT PRIMARY KEY,
          rol_id INT NOT NULL,
          permiso_id INT NOT NULL,
          fecha_crea DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (rol_id) REFERENCES roles(id_rol) ON DELETE CASCADE,
          FOREIGN KEY (permiso_id) REFERENCES permisos(id_permiso) ON DELETE CASCADE,
          UNIQUE KEY unique_rol_permiso (rol_id, permiso_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `);
      console.log('✅ Tabla rol_permisos creada exitosamente');
    } catch (error) {
      console.log(`❌ Error creando tabla rol_permisos: ${error.message}`);
    }
    
    // 7. Insertar cliente por defecto
    console.log('\n7. Insertando cliente por defecto...');
    try {
      const [existingClient] = await connection.execute(`
        SELECT id_cliente FROM clientes WHERE nombre = 'Cliente' AND apellido = 'Genérico'
      `);
      
      if (existingClient.length === 0) {
        await connection.execute(`
          INSERT INTO clientes (nombre, apellido, run, telefono, email, status) 
          VALUES ('Cliente', 'Genérico', '11111111-1', '123456789', 'cliente@ejemplo.com', 1)
        `);
        console.log('✅ Cliente por defecto insertado');
      } else {
        console.log('✅ Cliente por defecto ya existe');
      }
    } catch (error) {
      console.log(`❌ Error insertando cliente por defecto: ${error.message}`);
    }
    
    // 8. Abrir una caja por defecto
    console.log('\n8. Abriendo caja por defecto...');
    try {
      const [existingCaja] = await connection.execute(`
        SELECT id_caja FROM caja WHERE estado = 1
      `);
      
      if (existingCaja.length === 0) {
        // Buscar un usuario admin para asignar como quien abre la caja
        const [adminUser] = await connection.execute(`
          SELECT u.id_usuario FROM usuarios u 
          LEFT JOIN roles r ON r.id_rol = u.rol_id 
          WHERE r.nombre LIKE '%admin%' OR u.nombre LIKE '%admin%' 
          LIMIT 1
        `);
        
        const usuarioId = adminUser.length > 0 ? adminUser[0].id_usuario : 1;
        
        await connection.execute(`
          INSERT INTO caja (estado, fecha_apertura, monto_inicial, monto_actual, usuario_apertura) 
          VALUES (1, NOW(), 50000.00, 50000.00, ?)
        `, [usuarioId]);
        console.log('✅ Caja abierta por defecto');
      } else {
        console.log('✅ Ya hay una caja abierta');
      }
    } catch (error) {
      console.log(`❌ Error abriendo caja por defecto: ${error.message}`);
    }
    
    // 9. Insertar permisos básicos
    console.log('\n9. Insertando permisos básicos...');
    try {
      const permisos = [
        ['orders', 'view', 'Ver Pedidos', 'Permite ver la lista de pedidos'],
        ['orders', 'create', 'Crear Pedidos', 'Permite crear nuevos pedidos'],
        ['orders', 'procesar_pedidos', 'Procesar Pedidos', 'Permite procesar pedidos pendientes'],
        ['sales', 'view', 'Ver Ventas', 'Permite ver la lista de ventas'],
        ['sales', 'create', 'Crear Ventas', 'Permite crear nuevas ventas'],
        ['users', 'view', 'Ver Usuarios', 'Permite ver la lista de usuarios'],
        ['users', 'create', 'Crear Usuarios', 'Permite crear nuevos usuarios'],
        ['cash-register', 'view', 'Ver Caja', 'Permite ver el estado de la caja'],
        ['cash-register', 'manage', 'Gestionar Caja', 'Permite abrir/cerrar caja']
      ];
      
      for (const [modulo, accion, nombre, descripcion] of permisos) {
        try {
          await connection.execute(`
            INSERT IGNORE INTO permisos (modulo, accion, nombre, descripcion) 
            VALUES (?, ?, ?, ?)
          `, [modulo, accion, nombre, descripcion]);
        } catch (err) {
          // Ignorar errores de duplicados
        }
      }
      console.log('✅ Permisos básicos insertados');
    } catch (error) {
      console.log(`❌ Error insertando permisos: ${error.message}`);
    }
    
    // 10. Actualizar status de registros existentes
    console.log('\n10. Actualizando status de registros existentes...');
    try {
      await connection.execute(`UPDATE usuarios SET status = 1 WHERE status IS NULL`);
      await connection.execute(`UPDATE clientes SET status = 1 WHERE status IS NULL`);
      await connection.execute(`UPDATE categorias SET status = 1 WHERE status IS NULL`);
      console.log('✅ Status actualizado en registros existentes');
    } catch (error) {
      console.log(`❌ Error actualizando status: ${error.message}`);
    }
    
    console.log('\n🎉 Reparación de base de datos completada exitosamente!');
    console.log('\n📋 Resumen de cambios:');
    console.log('  ✅ Tabla caja creada');
    console.log('  ✅ Columnas status agregadas');
    console.log('  ✅ Sistema de permisos creado');
    console.log('  ✅ Cliente por defecto insertado');
    console.log('  ✅ Caja abierta por defecto');
    console.log('  ✅ Permisos básicos configurados');
    
  } catch (error) {
    console.error('❌ Error general:', error.message);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

fixDatabaseStructure();