/* eslint-disable no-console */

const mysql = require('mysql2/promise');
const dotenv = require('dotenv');
const { v4: uuidv4 } = require('uuid');

dotenv.config();

const config = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'lasmunecasderamon',
  port: parseInt(process.env.DB_PORT || '3306'),
};

async function testOrderSubmission() {
    console.log('--- Iniciando prueba de envÃ­o de pedido ---');
    let connection;

    try {
        connection = await mysql.createConnection(config);
        console.log('Conectado a la base de datos.');

        // 1. Obtener datos necesarios (un mesero, un cliente, un producto, una anfitriona)
        const [meseros] = await connection.execute('SELECT id_usuario FROM usuarios WHERE rol_id IN (SELECT id_rol FROM roles WHERE LOWER(nombre) = "garzon") LIMIT 1');
        const [clientes] = await connection.execute('SELECT id_cliente FROM clientes LIMIT 1');
        const [productos] = await connection.execute('SELECT id_producto, precio, comision FROM productos WHERE status = 1 LIMIT 1');
        const [anfitrionas] = await connection.execute('SELECT id_usuario FROM usuarios WHERE rol_id IN (SELECT id_rol FROM roles WHERE LOWER(nombre) = "anfitriona") LIMIT 1');

        if (meseros.length === 0 || productos.length === 0) {
            console.error('No se encontraron meseros o productos activos para la prueba.');
            return;
        }

        const meseroId = meseros[0].id_usuario;
        const clienteId = clientes.length > 0 ? clientes[0].id_cliente : null;
        const producto = productos[0];
        const anfitrionaId = anfitrionas.length > 0 ? anfitrionas[0].id_usuario : null;

        console.log('Datos de prueba seleccionados:');
        console.log('- Mesero ID:', meseroId);
        console.log('- Cliente ID:', clienteId);
        console.log('- Producto ID:', producto.id_producto, '(Precio:', producto.precio, ', Comision:', producto.comision, ')');
        console.log('- Anfitriona ID:', anfitrionaId);

        // 2. Simular el objeto de pedido que envÃ­a el frontend
        const subtotal = Number(producto.precio);
        const propina = subtotal * 0.1; // 10% de propina
        const total = subtotal + propina;
        const totalComision = Number(producto.comision || 0);
        const codigo = 'TEST-' + Math.random().toString(36).substring(2, 10).toUpperCase();
        const pedidoId = uuidv4();
        const fechaCrea = new Date().toISOString().slice(0, 19).replace('T', ' ');

        console.log('\nSimulando envÃ­o de pedido (Payload conceptual):');
        console.log({
            codigo,
            meseroId,
            clienteId,
            subtotal,
            total,
            propina,
            detalles: [{ productoId: producto.id_producto, precio: subtotal, comision: totalComision }]
        });

        // 3. Ejecutar inserciones directamente (simulando lo que hace el repositorio)
        await connection.beginTransaction();

        // Insertar pedido
        await connection.execute(`
            INSERT INTO pedidos (id_pedido, codigo, mesero_id, cliente_id, subtotal, total, total_comision, propina, estado, fecha_crea)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?)
        `, [pedidoId, codigo, meseroId, clienteId, subtotal, total, totalComision, propina, fechaCrea]);

        // Insertar detalle
        const detallePedidoId = uuidv4();
        await connection.execute(`
            INSERT INTO detalle_pedidos (id_detalle_pedido, pedido_id, producto_id, precio, comision, genera_comision, cantidad, subtotal, hostess_id, fecha_crea)
            VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?, ?)
        `, [detallePedidoId, pedidoId, producto.id_producto, subtotal, totalComision, totalComision > 0 ? 1 : 0, subtotal, anfitrionaId, fechaCrea]);

        if (anfitrionaId) {
            // detalle_pedidos_anfitrionas
            await connection.execute(`
                INSERT INTO detalle_pedidos_anfitrionas (id_detalle_anfitriona, detalle_pedido_id, anfitriona_id)
                VALUES (?, ?, ?)
            `, [uuidv4(), detallePedidoId, anfitrionaId]);

            // pedidos_usuarios
            await connection.execute(`
                INSERT INTO pedidos_usuarios (id_pedido_usuario, usuario_id, pedido_id)
                VALUES (?, ?, ?)
            `, [uuidv4(), anfitrionaId, pedidoId]);
        }

        await connection.commit();
        console.log('\nPedido creado exitosamente. ID:', pedidoId);

        // 4. Verificar en la base de datos
        console.log('\nVerificando datos en la base de datos...');
        
        const [pedidosDB] = await connection.execute('SELECT * FROM pedidos WHERE id_pedido = ?', [pedidoId]);
        const pedidoDB = pedidosDB[0];
        console.log('Tabla "pedidos":');
        console.log('- Cliente ID:', pedidoDB.cliente_id, '(Esperado:', clienteId, ')');
        console.log('- Subtotal:', Number(pedidoDB.subtotal), '(Esperado:', subtotal, ')');
        console.log('- Propina:', Number(pedidoDB.propina), '(Esperado:', propina, ')');
        console.log('- Total:', Number(pedidoDB.total), '(Esperado:', total, ')');
        
        const [detallesDB] = await connection.execute('SELECT * FROM detalle_pedidos WHERE pedido_id = ?', [pedidoId]);
        const detalleDB = detallesDB[0];
        console.log('\nTabla "detalle_pedidos":');
        console.log('- Producto ID:', detalleDB.producto_id);
        console.log('- Precio:', Number(detalleDB.precio), '(Esperado:', subtotal, ')');
        console.log('- Comision:', Number(detalleDB.comision), '(Esperado:', totalComision, ')');

        if (anfitrionaId) {
            const [anfitrionasDetalle] = await connection.execute('SELECT * FROM detalle_pedidos_anfitrionas WHERE detalle_pedido_id = ?', [detalleDB.id_detalle_pedido]);
            console.log('\nTabla "detalle_pedidos_anfitrionas":');
            console.log('- Registros encontrados:', anfitrionasDetalle.length);
            if (anfitrionasDetalle.length > 0) {
                console.log('- Anfitriona ID:', anfitrionasDetalle[0].anfitriona_id, '(Esperado:', anfitrionaId, ')');
            }

            const [usuariosPedido] = await connection.execute('SELECT * FROM pedidos_usuarios WHERE pedido_id = ?', [pedidoId]);
            console.log('\nTabla "pedidos_usuarios":');
            console.log('- Registros encontrados:', usuariosPedido.length);
        }

        console.log('\n--- Prueba finalizada con Ã‰XITO ---');

    } catch (error) {
        if (connection) await connection.rollback();
        console.error('\n--- ERROR durante la prueba ---');
        console.error(error);
    } finally {
        if (connection) await connection.end();
        process.exit(0);
    }
}

testOrderSubmission();

