/* eslint-disable no-console */
const mysql = require('mysql2/promise');
const crypto = require('crypto');
require('dotenv').config();

async function runIntegrationTest() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
  });

  try {
    // 1. Obtener datos necesarios
    const [users] = await connection.execute(
      'SELECT id_usuario FROM usuarios WHERE estado = 1 LIMIT 2'
    );
    const [clients] = await connection.execute('SELECT id_cliente FROM clientes LIMIT 1');
    const [products] = await connection.execute(
      'SELECT id_producto, precio FROM productos LIMIT 1'
    );
    const [cajas] = await connection.execute(
      'SELECT id_caja FROM cajas WHERE estado = 1 ORDER BY fecha_apertura DESC LIMIT 1'
    );

    if (users.length < 1 || clients.length < 1 || products.length < 1 || cajas.length < 1) {
      throw new Error('Faltan datos base en la DB (usuarios, clientes, productos o caja abierta)');
    }

    const userId = users[0].id_usuario;
    const anfitrionaId = users[1]?.id_usuario || userId;
    const clientId = clients[0].id_cliente;
    const product = products[0];
    const cajaId = cajas[0].id_caja;

    const ventaId = crypto.randomUUID();
    const pedidoId = crypto.randomUUID();
    const codigo = 'INT-' + Math.random().toString(36).substring(2, 8).toUpperCase();
    const now = new Date();

    await connection.execute(
      'INSERT INTO pedidos (id_pedido, codigo, cliente_id, mesero_id, total, estado, fecha_crea) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [pedidoId, codigo, clientId, userId, product.precio, 0, now] // estado 0 = procesado/finalizado
    );
    // Insertar venta
    await connection.execute(
      `
            INSERT INTO ventas (
                id_venta, codigo, cliente_id, pedido_id, metodo_pago,
                sub_total, total, propina, total_comision,
                caja_id, created_by, estado, fecha_crea
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
      [
        ventaId,
        codigo,
        clientId,
        pedidoId,
        'efectivo',
        product.precio,
        product.precio + 1000,
        1000,
        500,
        cajaId,
        userId,
        1,
        now
      ]
    );

    // Detalle de venta
    const detalleId = crypto.randomUUID();
    await connection.execute(
      `
            INSERT INTO detalle_ventas (
                id_detalle_venta, venta_id, producto_id, precio,
                cantidad, sub_total, comision, hostess_id, fecha_crea
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
      [
        detalleId,
        ventaId,
        product.id_producto,
        product.precio,
        1,
        product.precio,
        500,
        anfitrionaId,
        now
      ]
    );

    // RelaciÃ³n venta-usuario (anfitriona)
    await connection.execute(
      'INSERT INTO ventas_usuarios (id_usuario_venta, venta_id, usuario_id, fecha_crea) VALUES (?, ?, ?, ?)',
      [crypto.randomUUID(), ventaId, anfitrionaId, now]
    );

    const [ventaRows] = await connection.execute('SELECT * FROM ventas WHERE id_venta = ?', [
      ventaId
    ]);
    if (ventaRows.length === 1) {
      console.log('âœ… Venta persistida correctamente');
    } else {
      throw new Error('La venta no se guardÃ³');
    }

    const [detalleRows] = await connection.execute(
      'SELECT * FROM detalle_ventas WHERE venta_id = ?',
      [ventaId]
    );
    if (detalleRows.length === 1) {
      console.log('âœ… Detalle de venta persistido correctamente');
    } else {
      throw new Error('El detalle de venta no se guardÃ³');
    }

    const [relRows] = await connection.execute('SELECT * FROM ventas_usuarios WHERE venta_id = ?', [
      ventaId
    ]);
    if (relRows.length === 1) {
      console.log('âœ… RelaciÃ³n con anfitriona persistida correctamente');
    }

    console.log(`\n[5] Limpiando datos de prueba`);
    await connection.execute('DELETE FROM detalle_ventas WHERE venta_id = ?', [ventaId]);
    await connection.execute('DELETE FROM ventas_usuarios WHERE venta_id = ?', [ventaId]);
    await connection.execute('DELETE FROM ventas WHERE id_venta = ?', [ventaId]);
    await connection.execute('DELETE FROM pedidos WHERE id_pedido = ?', [pedidoId]);

    console.log('âœ… Limpieza completada');
    console.log('\n--- PRUEBA DE INTEGRACIÃ“N EXITOSA ---');
  } catch (error) {
    console.error('\nâŒ ERROR EN PRUEBA DE INTEGRACIÃ“N:', error);
    process.exit(1);
  } finally {
    await connection.end();
  }
}

runIntegrationTest();

