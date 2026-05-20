/* eslint-disable no-console */
const mysql = require('mysql2/promise');
const crypto = require('crypto');
require('dotenv').config();

function uuid() {
  return crypto.randomUUID();
}

async function ensureClient(connection, now) {
  const [clients] = await connection.execute('SELECT id_cliente FROM clientes LIMIT 1');
  if (clients.length > 0) {
    return { id: clients[0].id_cliente, created: false };
  }

  const clientId = uuid();
  await connection.execute(
    `INSERT INTO clientes (
      id_cliente, run, nombre, apellido, telefono, fecha_crea, estado, saldo
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [clientId, 'INT-TEST', 'Cliente', 'Integracion', null, now, 1, 0]
  );

  return { id: clientId, created: true };
}

async function ensureOpenCaja(connection, userId, now) {
  const [cajas] = await connection.execute(
    'SELECT id_caja FROM cajas WHERE estado = 1 ORDER BY fecha_apertura DESC LIMIT 1'
  );
  if (cajas.length > 0) {
    return { id: cajas[0].id_caja, created: false };
  }

  const cajaId = uuid();
  await connection.execute(
    `INSERT INTO cajas (
      id_caja, fecha_apertura, usuario_id_apertura, monto_apertura,
      efectivo, tarjeta, transferencia, prepago,
      monto_cierre, venta, servicio, devolucion, iva, comision, propina, anticipo, estado
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [cajaId, now, userId, 10000, 0, 0, 0, 0, 10000, 0, 0, 0, 0, 0, 0, 0, 1]
  );

  return { id: cajaId, created: true };
}

async function runIntegrationTest() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
  });

  const created = {
    clientId: null,
    cajaId: null,
    pedidoId: null,
    ventaId: null,
    detalleId: null,
    relacionId: null
  };

  try {
    const [users] = await connection.execute(
      'SELECT id_usuario FROM usuarios WHERE estado = 1 LIMIT 2'
    );
    const [products] = await connection.execute(
      'SELECT id_producto, precio, comision FROM productos WHERE estado = 1 LIMIT 1'
    );

    if (users.length < 1 || products.length < 1) {
      throw new Error('Faltan datos base en la DB (usuarios o productos activos)');
    }

    const userId = users[0].id_usuario;
    const anfitrionaId = users[1]?.id_usuario || userId;
    const product = products[0];
    const now = new Date();

    const client = await ensureClient(connection, now);
    const caja = await ensureOpenCaja(connection, userId, now);

    created.clientId = client.created ? client.id : null;
    created.cajaId = caja.created ? caja.id : null;

    const clientId = client.id;
    const cajaId = caja.id;
    const subtotal = Number(product.precio);
    const comision = Number(product.comision || 0);
    const propina = 1000;
    const total = subtotal + propina;

    created.pedidoId = uuid();
    created.ventaId = uuid();
    created.detalleId = uuid();
    created.relacionId = uuid();

    const codigo = 'INT-' + Math.random().toString(36).substring(2, 8).toUpperCase();

    await connection.execute(
      `INSERT INTO pedidos (
        id_pedido, codigo, cliente_id, mesero_id,
        subtotal, total, propina, total_comision, estado, fecha_crea
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [created.pedidoId, codigo, clientId, userId, subtotal, total, propina, comision, 0, now]
    );

    await connection.execute(
      `INSERT INTO ventas (
        id_venta, codigo, cliente_id, pedido_id, metodo_pago,
        sub_total, total, propina, total_comision,
        caja_id, created_by, estado, fecha_crea
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        created.ventaId,
        codigo,
        clientId,
        created.pedidoId,
        'efectivo',
        subtotal,
        total,
        propina,
        comision,
        cajaId,
        userId,
        1,
        now
      ]
    );

    await connection.execute(
      `INSERT INTO detalle_ventas (
        id_detalle_venta, venta_id, producto_id, precio,
        cantidad, sub_total, comision, hostess_id, fecha_crea
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        created.detalleId,
        created.ventaId,
        product.id_producto,
        subtotal,
        1,
        subtotal,
        comision,
        anfitrionaId,
        now
      ]
    );

    await connection.execute(
      'INSERT INTO ventas_usuarios (id_usuario_venta, venta_id, usuario_id, fecha_crea) VALUES (?, ?, ?, ?)',
      [created.relacionId, created.ventaId, anfitrionaId, now]
    );

    const [ventaRows] = await connection.execute('SELECT * FROM ventas WHERE id_venta = ?', [
      created.ventaId
    ]);
    if (ventaRows.length !== 1) {
      throw new Error('La venta no se guardó');
    }
    console.log('✅ Venta persistida correctamente');

    const [detalleRows] = await connection.execute(
      'SELECT * FROM detalle_ventas WHERE venta_id = ?',
      [created.ventaId]
    );
    if (detalleRows.length !== 1) {
      throw new Error('El detalle de venta no se guardó');
    }
    console.log('✅ Detalle de venta persistido correctamente');

    const [relRows] = await connection.execute('SELECT * FROM ventas_usuarios WHERE venta_id = ?', [
      created.ventaId
    ]);
    if (relRows.length !== 1) {
      throw new Error('La relación con anfitriona no se guardó');
    }
    console.log('✅ Relación con anfitriona persistida correctamente');

    console.log('\n--- PRUEBA DE INTEGRACIÓN EXITOSA ---');
  } catch (error) {
    console.error('\n❌ ERROR EN PRUEBA DE INTEGRACIÓN:', error);
    process.exitCode = 1;
  } finally {
    if (created.ventaId) {
      await connection.execute('DELETE FROM detalle_ventas WHERE venta_id = ?', [created.ventaId]);
      await connection.execute('DELETE FROM ventas_usuarios WHERE venta_id = ?', [created.ventaId]);
      await connection.execute('DELETE FROM ventas WHERE id_venta = ?', [created.ventaId]);
    }
    if (created.pedidoId) {
      await connection.execute('DELETE FROM pedidos WHERE id_pedido = ?', [created.pedidoId]);
    }
    if (created.cajaId) {
      await connection.execute('DELETE FROM cajas WHERE id_caja = ?', [created.cajaId]);
    }
    if (created.clientId) {
      await connection.execute('DELETE FROM clientes WHERE id_cliente = ?', [created.clientId]);
    }

    await connection.end();
  }
}

runIntegrationTest();
