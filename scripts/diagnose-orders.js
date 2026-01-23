const mysql = require('mysql2/promise');
require('dotenv').config();

const config = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'nuwesoft',
  port: parseInt(process.env.DB_PORT || '3307')
};

async function diagnoseOrders() {
  let connection;
  
  try {
    console.log('🔍 Iniciando diagnóstico del sistema de pedidos...\n');
    
    // 1. Verificar conexión a la base de datos
    console.log('1. Verificando conexión a la base de datos...');
    connection = await mysql.createConnection(config);
    console.log('✅ Conexión exitosa\n');
    
    // 2. Verificar tablas necesarias
    console.log('2. Verificando tablas necesarias...');
    const tables = ['pedidos', 'detalle_pedidos', 'pedidos_usuarios', 'productos', 'categorias', 'clientes', 'usuarios', 'caja'];
    
    for (const table of tables) {
      try {
        const [rows] = await connection.execute(`SELECT COUNT(*) as count FROM ${table}`);
        console.log(`✅ Tabla ${table}: ${rows[0].count} registros`);
      } catch (error) {
        console.log(`❌ Error en tabla ${table}: ${error.message}`);
      }
    }
    console.log('');
    
    // 3. Verificar estado de caja
    console.log('3. Verificando estado de caja...');
    try {
      const [cajas] = await connection.execute(`
        SELECT id_caja, estado, fecha_apertura, fecha_cierre, monto_inicial, monto_actual 
        FROM caja 
        ORDER BY fecha_apertura DESC 
        LIMIT 5
      `);
      
      if (cajas.length === 0) {
        console.log('❌ No hay registros de caja');
      } else {
        console.log('Últimas 5 cajas:');
        cajas.forEach(caja => {
          const estado = caja.estado === 1 ? 'ABIERTA' : 'CERRADA';
          console.log(`  - ID: ${caja.id_caja}, Estado: ${estado}, Fecha: ${caja.fecha_apertura}`);
        });
        
        const cajaAbierta = cajas.find(c => c.estado === 1);
        if (cajaAbierta) {
          console.log(`✅ Hay una caja abierta (ID: ${cajaAbierta.id_caja})`);
        } else {
          console.log('❌ No hay caja abierta actualmente');
        }
      }
    } catch (error) {
      console.log(`❌ Error verificando caja: ${error.message}`);
    }
    console.log('');
    
    // 4. Verificar usuarios y roles
    console.log('4. Verificando usuarios activos...');
    try {
      const [usuarios] = await connection.execute(`
        SELECT u.id_usuario, u.nombre, u.apellido, u.nick, r.nombre as rol, u.status
        FROM usuarios u
        LEFT JOIN roles r ON r.id_rol = u.rol_id
        WHERE u.status = 1
        ORDER BY r.nombre, u.nombre
      `);
      
      console.log(`Total usuarios activos: ${usuarios.length}`);
      
      const roleCount = {};
      usuarios.forEach(user => {
        const role = user.rol || 'Sin rol';
        roleCount[role] = (roleCount[role] || 0) + 1;
      });
      
      Object.entries(roleCount).forEach(([role, count]) => {
        console.log(`  - ${role}: ${count} usuarios`);
      });
    } catch (error) {
      console.log(`❌ Error verificando usuarios: ${error.message}`);
    }
    console.log('');
    
    // 5. Verificar clientes
    console.log('5. Verificando clientes...');
    try {
      const [clientes] = await connection.execute(`
        SELECT COUNT(*) as total, 
               SUM(CASE WHEN status = 1 THEN 1 ELSE 0 END) as activos
        FROM clientes
      `);
      
      console.log(`Total clientes: ${clientes[0].total}, Activos: ${clientes[0].activos}`);
    } catch (error) {
      console.log(`❌ Error verificando clientes: ${error.message}`);
    }
    console.log('');
    
    // 6. Verificar productos y categorías
    console.log('6. Verificando productos y categorías...');
    try {
      const [categorias] = await connection.execute(`
        SELECT c.id_categoria, c.nombre, c.status,
               COUNT(p.id_producto) as total_productos
        FROM categorias c
        LEFT JOIN productos p ON p.categoria_id = c.id_categoria
        GROUP BY c.id_categoria, c.nombre, c.status
        ORDER BY c.nombre
      `);
      
      console.log('Categorías:');
      categorias.forEach(cat => {
        const estado = cat.status === 1 ? 'ACTIVA' : 'INACTIVA';
        console.log(`  - ${cat.nombre}: ${cat.total_productos} productos (${estado})`);
      });
    } catch (error) {
      console.log(`❌ Error verificando productos: ${error.message}`);
    }
    console.log('');
    
    // 7. Verificar pedidos recientes
    console.log('7. Verificando pedidos recientes...');
    try {
      const [pedidos] = await connection.execute(`
        SELECT p.id_pedido, p.codigo, p.estado, p.fecha_crea, p.total,
               COALESCE(CONCAT(c.nombre, ' ', c.apellido), 'Sin cliente') as cliente,
               CONCAT(u.nombre, ' ', u.apellido) as mesero
        FROM pedidos p
        LEFT JOIN clientes c ON c.id_cliente = p.cliente_id
        LEFT JOIN usuarios u ON u.id_usuario = p.mesero_id
        ORDER BY p.fecha_crea DESC
        LIMIT 10
      `);
      
      if (pedidos.length === 0) {
        console.log('No hay pedidos registrados');
      } else {
        console.log('Últimos 10 pedidos:');
        pedidos.forEach(pedido => {
          const estados = { 0: 'COMPLETADO', 1: 'PENDIENTE', 2: 'CANCELADO' };
          const estado = estados[pedido.estado] || 'DESCONOCIDO';
          console.log(`  - ${pedido.codigo}: ${estado}, $${pedido.total}, ${pedido.cliente} (${pedido.mesero})`);
        });
      }
    } catch (error) {
      console.log(`❌ Error verificando pedidos: ${error.message}`);
    }
    console.log('');
    
    // 8. Verificar permisos
    console.log('8. Verificando estructura de permisos...');
    try {
      const [permisos] = await connection.execute(`
        SELECT COUNT(*) as total FROM permisos
      `);
      console.log(`Total permisos configurados: ${permisos[0].total}`);
      
      const [rolePermisos] = await connection.execute(`
        SELECT r.nombre as rol, COUNT(rp.permiso_id) as permisos
        FROM roles r
        LEFT JOIN rol_permisos rp ON rp.rol_id = r.id_rol
        GROUP BY r.id_rol, r.nombre
        ORDER BY r.nombre
      `);
      
      console.log('Permisos por rol:');
      rolePermisos.forEach(rp => {
        console.log(`  - ${rp.rol}: ${rp.permisos} permisos`);
      });
    } catch (error) {
      console.log(`❌ Error verificando permisos: ${error.message}`);
    }
    
    console.log('\n🎯 Diagnóstico completado');
    
  } catch (error) {
    console.error('❌ Error general:', error.message);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

diagnoseOrders();