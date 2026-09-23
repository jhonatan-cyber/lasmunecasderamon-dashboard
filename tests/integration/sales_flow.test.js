require('../../scripts/guard-local-db')();
const postgres = require('../../scripts/postgres-test-client.cjs');
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

// Crea SIEMPRE una caja nueva (para poder mutar sus buckets sin tocar datos existentes)
async function ensureFreshCaja(connection, userId, now) {
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
  const connection = await postgres.createConnection({
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
    relacionId: null,
    freshCajaId: null,
    venta2Id: null,
    detalle2Id: null,
    relacion2Id: null,
    propina2Id: null
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

    // ─── ESCENARIO 2: Venta con TARJETA + propina (reparto) ───
    // No existe cargo por tarjeta: el total es subtotal + propina. La caja
    // registra venta = subtotal, tarjeta = total pagado y la propina en su
    // bucket (se reparte entre todos los cajeros/garzones activos).
    const propina2 = 1000;
    const total2 = subtotal + propina2;

    const freshCaja = await ensureFreshCaja(connection, userId, now);
    created.freshCajaId = freshCaja.id;

    created.venta2Id = uuid();
    created.detalle2Id = uuid();
    created.relacion2Id = uuid();
    const codigo2 = 'INT-' + Math.random().toString(36).substring(2, 8).toUpperCase();

    await connection.execute(
      `INSERT INTO ventas (
        id_venta, codigo, cliente_id, pedido_id, metodo_pago,
        sub_total, total, propina, total_comision,
        caja_id, created_by, estado, fecha_crea
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        created.venta2Id,
        codigo2,
        clientId,
        null,
        'tarjeta',
        subtotal,
        total2,
        propina2,
        comision,
        freshCaja.id,
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
        created.detalle2Id,
        created.venta2Id,
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
      [created.relacion2Id, created.venta2Id, anfitrionaId, now]
    );

    // Deltas de caja: venta = subtotal (sin cargo), tarjeta = total pagado
    await connection.execute(
      `UPDATE cajas
       SET venta = venta + ?, tarjeta = tarjeta + ?
       WHERE id_caja = ?`,
      [subtotal, total2, freshCaja.id]
    );

    // Reparto: mismo query de TipRepository (todos los cajeros/garzones activos en local)
    const [distUsers] = await connection.execute(
      `SELECT DISTINCT u.id_usuario
       FROM logins l
       INNER JOIN usuarios u ON u.id_usuario = l.usuario_id
       INNER JOIN roles r ON r.id_rol = u.rol_id
       WHERE l.estado = 1
         AND l.en_local = 1
         AND u.estado = 1
         AND LOWER(r.nombre) IN ('cajero', 'garzon')`
    );

    created.propina2Id = uuid();
    await connection.execute(
      'INSERT INTO propinas (id_propina, venta_id, propina, fecha_crea, estado) VALUES (?, ?, ?, ?, 1)',
      [created.propina2Id, created.venta2Id, propina2, now]
    );

    if (distUsers.length > 0) {
      const count = distUsers.length;
      const montoBase = Math.floor(propina2 / count);
      const resto = propina2 - montoBase * count;
      for (let i = 0; i < count; i++) {
        const monto = montoBase + (i < resto ? 1 : 0);
        await connection.execute(
          `INSERT INTO detalle_propinas (
            id_detalle_propina, propina_id, usuario_id, monto, fecha_crea, estado
          ) VALUES (?, ?, ?, ?, ?, 1)`,
          [uuid(), created.propina2Id, distUsers[i].id_usuario, monto, now]
        );
      }
    }

    // ─── Verificaciones del escenario 2 ───
    const [venta2Rows] = await connection.execute('SELECT * FROM ventas WHERE id_venta = ?', [
      created.venta2Id
    ]);
    const v2 = venta2Rows[0];
    if (Number(v2.cargo_tarjeta || 0) !== 0) {
      throw new Error(
        `cargo_tarjeta debe ser 0 (ya no existe el cargo): obtenido ${v2.cargo_tarjeta}`
      );
    }
    if (Number(v2.total) !== subtotal + propina2) {
      throw new Error(`total incorrecto: esperado ${subtotal + propina2}, obtenido ${v2.total}`);
    }
    console.log('✅ Venta tarjeta: sin cargo, total cuadra (sub + propina)');

    const [caja2Rows] = await connection.execute('SELECT * FROM cajas WHERE id_caja = ?', [
      freshCaja.id
    ]);
    const c2 = caja2Rows[0];
    if (Number(c2.venta) !== subtotal) {
      throw new Error(
        `caja.venta debe ser el subtotal (sin cargo): esperado ${subtotal}, obtenido ${c2.venta}`
      );
    }
    if (Number(c2.cargo_tarjeta || 0) !== 0) {
      throw new Error(
        `caja.cargo_tarjeta debe ser 0 (ya no existe el cargo): obtenido ${c2.cargo_tarjeta}`
      );
    }
    if (Number(c2.tarjeta) !== total2) {
      throw new Error(
        `caja.tarjeta debe ser el total pagado: esperado ${total2}, obtenido ${c2.tarjeta}`
      );
    }
    console.log('✅ Caja: venta = subtotal, tarjeta = total pagado, sin bucket de cargo');

    const [prop2Rows] = await connection.execute('SELECT * FROM propinas WHERE id_propina = ?', [
      created.propina2Id
    ]);
    if (Number(prop2Rows[0].propina) !== propina2) {
      throw new Error(
        `propina registrada incorrecta: esperado ${propina2}, obtenido ${prop2Rows[0].propina}`
      );
    }
    console.log('✅ Propina registrada = solo propina_venta (reparto)');

    if (distUsers.length > 0) {
      const [sumRows] = await connection.execute(
        'SELECT SUM(monto) AS total FROM detalle_propinas WHERE propina_id = ?',
        [created.propina2Id]
      );
      const sumDetalles = Number(sumRows[0].total);
      if (sumDetalles !== propina2) {
        throw new Error(`Suma de detalles (${sumDetalles}) != propina (${propina2})`);
      }

      const [countRows] = await connection.execute(
        'SELECT COUNT(DISTINCT usuario_id) AS c FROM detalle_propinas WHERE propina_id = ?',
        [created.propina2Id]
      );
      if (Number(countRows[0].c) !== distUsers.length) {
        throw new Error(
          `El reparto debe incluir a ${distUsers.length} usuarios (todos los cajeros/garzones activos en local), recibió ${countRows[0].c}`
        );
      }
      console.log(
        `✅ Reparto cuadra: ${distUsers.length} usuarios activos, suma de detalles = $${sumDetalles} (igual a la propina)`
      );
    } else {
      console.log('⚠️ Sin cajeros/garzones activos en local: propina sin detalles (esperado)');
    }

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
    if (created.propina2Id) {
      await connection.execute('DELETE FROM detalle_propinas WHERE propina_id = ?', [
        created.propina2Id
      ]);
      await connection.execute('DELETE FROM propinas WHERE id_propina = ?', [created.propina2Id]);
    }
    if (created.venta2Id) {
      await connection.execute('DELETE FROM detalle_ventas WHERE venta_id = ?', [created.venta2Id]);
      await connection.execute('DELETE FROM ventas_usuarios WHERE venta_id = ?', [
        created.venta2Id
      ]);
      await connection.execute('DELETE FROM ventas WHERE id_venta = ?', [created.venta2Id]);
    }
    if (created.freshCajaId) {
      await connection.execute('DELETE FROM cajas WHERE id_caja = ?', [created.freshCajaId]);
    }
    if (created.clientId) {
      await connection.execute('DELETE FROM clientes WHERE id_cliente = ?', [created.clientId]);
    }

    await connection.end();
  }
}

runIntegrationTest();
