/* eslint-disable no-console */
require('../../scripts/guard-local-db')();
const mysql = require('mysql2/promise');
const crypto = require('crypto');
require('dotenv').config();

async function runIntegrationTest() {
  console.log('--- INICIANDO PRUEBA DE INTEGRACIÓN: Flujo de Cuentas Completo ---');

  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
  });

  try {
    const [users] = await connection.execute(
      'SELECT id_usuario FROM usuarios WHERE estado = 1 LIMIT 2'
    );
    const [clients] = await connection.execute(
      'SELECT id_cliente, saldo FROM clientes WHERE saldo >= 0 LIMIT 1'
    );
    const [products] = await connection.execute(
      'SELECT id_producto, precio FROM productos LIMIT 1'
    );
    const [rooms] = await connection.execute(
      'SELECT id_habitacion FROM habitaciones WHERE estado = 1 LIMIT 1'
    );
    const [cajas] = await connection.execute(
      'SELECT id_caja FROM cajas WHERE estado = 1 ORDER BY fecha_apertura DESC LIMIT 1'
    );

    if (
      users.length < 1 ||
      clients.length < 1 ||
      products.length < 1 ||
      rooms.length < 1 ||
      cajas.length < 1
    ) {
      throw new Error(
        'Faltan datos base en la DB (usuarios, clientes, productos, habitaciones disponibles o caja abierta)'
      );
    }

    const userId = users[0].id_usuario;
    const anfitrionaId = users[1]?.id_usuario || userId;
    const clientId = clients[0].id_cliente;
    const product = products[0];
    const roomId = rooms[0].id_habitacion;
    const cajaId = cajas[0].id_caja;

    const cuentaId = crypto.randomUUID();
    const codigo = 'INT-C-' + Math.random().toString(36).substring(2, 8).toUpperCase();
    const now = new Date();

    console.log(`\n[1] Creando Cuenta vinculada a habitación: ${roomId}`);
    await connection.execute(
      `
            INSERT INTO cuentas (
                id_cuenta, codigo, cliente_id, habitacion_id, 
                sub_total, total, total_comision, propina, 
                estado, fecha_crea, created_by, tiempo
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
      [
        cuentaId,
        codigo,
        clientId,
        roomId,
        product.precio,
        product.precio,
        500,
        0,
        1,
        now,
        userId,
        60
      ]
    );

    await connection.execute('UPDATE habitaciones SET estado = 2 WHERE id_habitacion = ?', [
      roomId
    ]);

    console.log(`\n[2] Registrando Detalle Inicial`);
    const detalleId = crypto.randomUUID();
    await connection.execute(
      `
            INSERT INTO detalle_cuentas (
                id_detalle_cuenta, cuenta_id, producto_id, precio, 
                cantidad, sub_total, comision, hostess_id, fecha_crea, created_by
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
      [
        detalleId,
        cuentaId,
        product.id_producto,
        product.precio,
        1,
        product.precio,
        500,
        anfitrionaId,
        now,
        userId
      ]
    );

    console.log(`\n[3] Verificando Estado de Habitación (Ocupada)`);
    const [roomRows] = await connection.execute(
      'SELECT estado FROM habitaciones WHERE id_habitacion = ?',
      [roomId]
    );
    if (roomRows[0].estado === 2) {
      console.log('✅ Habitación marcada como ocupada OK');
    } else {
      throw new Error('La habitación no cambió a estado ocupado');
    }

    console.log(`\n[4] Simulando Cobro de Cuenta`);
    const metodoPago = 'efectivo';
    const totalCobrado = product.precio + 2000;
    const propina = 2000;

    await connection.execute(
      `
            UPDATE cuentas 
            SET estado = 2, metodo_pago = ?, cobrado_por = ?, fecha_mod = ? 
            WHERE id_cuenta = ?
        `,
      [metodoPago, userId, new Date(), cuentaId]
    );

    await connection.execute('UPDATE habitaciones SET estado = 1 WHERE id_habitacion = ?', [
      roomId
    ]);

    await connection.execute(
      `
            UPDATE cajas 
            SET efectivo = efectivo + ?,
                propina = propina + ?,
                venta = venta + ?
            WHERE id_caja = ?
        `,
      [product.precio, propina, product.precio, cajaId]
    );

    console.log(`\n[5] Verificando Liberación de Habitación`);
    const [roomRowsFinal] = await connection.execute(
      'SELECT estado FROM habitaciones WHERE id_habitacion = ?',
      [roomId]
    );
    if (roomRowsFinal[0].estado === 1) {
      console.log('✅ Habitación liberada OK');
    } else {
      throw new Error('La habitación no se liberó tras el cobro');
    }

    // ─── ESCENARIO 2: Cobro de cuenta con TARJETA + propina ───
    // Replica el flujo real de CuentaQueries.cobrar: venta = total de la
    // cuenta, propina a su bucket (se reparte) y tarjeta = montoCobrar
    // (cuenta + propina). Ya no existe cargo por tarjeta.
    console.log(`\n[6] Cobro de cuenta con TARJETA + propina (buckets de caja)`);

    // Caja fresca para mutar sus buckets sin tocar la caja real
    const freshCajaId = crypto.randomUUID();
    await connection.execute(
      `INSERT INTO cajas (
        id_caja, fecha_apertura, usuario_id_apertura, monto_apertura,
        efectivo, tarjeta, transferencia, prepago,
        monto_cierre, venta, cargo_tarjeta, servicio, devolucion, iva, comision, propina, anticipo, estado
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [freshCajaId, now, userId, 10000, 0, 0, 0, 0, 10000, 0, 0, 0, 0, 0, 0, 0, 0, 1]
    );

    const cuenta2Id = crypto.randomUUID();
    const codigo2 = 'INT-C2-' + Math.random().toString(36).substring(2, 8).toUpperCase();
    const totalCuenta2 = Number(product.precio);
    const propina2 = 2000;
    const montoCobrar2 = totalCuenta2 + propina2;

    await connection.execute(
      `INSERT INTO cuentas (
        id_cuenta, codigo, cliente_id, sub_total, total, total_comision,
        propina, estado, fecha_crea, created_by, tiempo
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [cuenta2Id, codigo2, clientId, totalCuenta2, totalCuenta2, 0, 0, 1, now, userId, 0]
    );

    // Cobro según CuentaQueries.cobrar (tipoPago tarjeta):
    //   montoCobrar = montoFinal + propinaFinal
    //   venta = montoFinal, propina a su bucket, tarjeta = montoCobrar
    await connection.execute(
      'UPDATE cuentas SET estado = 0, metodo_pago = ?, cobrado_por = ?, propina = ?, fecha_mod = ? WHERE id_cuenta = ?',
      ['tarjeta', userId, propina2, new Date(), cuenta2Id]
    );
    await connection.execute(
      `UPDATE cajas
       SET venta = venta + ?,
           propina = propina + ?,
           tarjeta = tarjeta + ?
       WHERE id_caja = ?`,
      [totalCuenta2, propina2, montoCobrar2, freshCajaId]
    );

    const [caja2Rows] = await connection.execute('SELECT * FROM cajas WHERE id_caja = ?', [
      freshCajaId
    ]);
    const c2 = caja2Rows[0];
    if (Number(c2.venta) !== totalCuenta2) {
      throw new Error(
        `caja.venta debe ser el total de la cuenta: esperado ${totalCuenta2}, obtenido ${c2.venta}`
      );
    }
    if (Number(c2.cargo_tarjeta || 0) !== 0) {
      throw new Error(
        `caja.cargo_tarjeta debe ser 0 (ya no existe el cargo): obtenido ${c2.cargo_tarjeta}`
      );
    }
    if (Number(c2.propina) !== propina2) {
      throw new Error(`caja.propina incorrecta: esperado ${propina2}, obtenido ${c2.propina}`);
    }
    if (Number(c2.tarjeta) !== montoCobrar2) {
      throw new Error(
        `caja.tarjeta debe ser el total cobrado (cuenta + propina): esperado ${montoCobrar2}, obtenido ${c2.tarjeta}`
      );
    }
    console.log(
      '✅ Caja cobro tarjeta: venta = cuenta, propina aparte, tarjeta = montoCobrar, sin cargo'
    );

    const [cuenta2Rows] = await connection.execute('SELECT * FROM cuentas WHERE id_cuenta = ?', [
      cuenta2Id
    ]);
    if (cuenta2Rows[0].estado !== 0 || cuenta2Rows[0].metodo_pago !== 'tarjeta') {
      throw new Error('La cuenta 2 no quedó cobrada (estado=0, metodo=tarjeta)');
    }
    console.log('✅ Cuenta 2 cobrada con tarjeta (estado 0)');

    console.log(`\n[7] Limpiando datos de prueba`);
    await connection.execute('DELETE FROM detalle_cuentas WHERE cuenta_id = ?', [cuentaId]);
    await connection.execute('DELETE FROM cuentas_usuarios WHERE cuenta_id = ?', [cuentaId]);
    await connection.execute('DELETE FROM cuentas WHERE id_cuenta = ?', [cuentaId]);
    await connection.execute('DELETE FROM cuentas WHERE id_cuenta = ?', [cuenta2Id]);
    await connection.execute('DELETE FROM cajas WHERE id_caja = ?', [freshCajaId]);

    await connection.execute(
      `
            UPDATE cajas 
            SET efectivo = efectivo - ?,
                propina = propina - ?,
                venta = venta - ?
            WHERE id_caja = ?
        `,
      [product.precio, propina, product.precio, cajaId]
    );

    console.log('✅ Limpieza completada');
    console.log('\n--- PRUEBA DE INTEGRACIÓN EXITOSA ---');
  } catch (error) {
    console.error('\nâŒ ERROR EN PRUEBA DE INTEGRACIÓN:', error);
    process.exit(1);
  } finally {
    await connection.end();
  }
}

runIntegrationTest();
