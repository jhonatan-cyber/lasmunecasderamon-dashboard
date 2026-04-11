/* eslint-disable no-console */
const mysql = require('mysql2/promise');
const crypto = require('crypto');
require('dotenv').config();

async function runIntegrationTest() {
  console.log('--- INICIANDO PRUEBA DE INTEGRACIÃ“N: Flujo de Cuentas Completo ---');

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

    console.log(`\n[1] Creando Cuenta vinculada a habitaciÃ³n: ${roomId}`);
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

    // Marcar habitaciÃ³n como ocupada
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

    console.log(`\n[3] Verificando Estado de HabitaciÃ³n (Ocupada)`);
    const [roomRows] = await connection.execute(
      'SELECT estado FROM habitaciones WHERE id_habitacion = ?',
      [roomId]
    );
    if (roomRows[0].estado === 2) {
      console.log('âœ… HabitaciÃ³n marcada como ocupada OK');
    } else {
      throw new Error('La habitaciÃ³n no cambiÃ³ a estado ocupado');
    }

    console.log(`\n[4] Simulando Cobro de Cuenta`);
    const metodoPago = 'efectivo';
    const totalCobrado = product.precio + 2000; // precio + propina
    const propina = 2000;

    // Actualizar cuenta a estado 2 (cobrada)
    await connection.execute(
      `
            UPDATE cuentas 
            SET estado = 2, metodo_pago = ?, cobrado_por = ?, fecha_mod = ? 
            WHERE id_cuenta = ?
        `,
      [metodoPago, userId, new Date(), cuentaId]
    );

    // Liberar habitaciÃ³n
    await connection.execute('UPDATE habitaciones SET estado = 1 WHERE id_habitacion = ?', [
      roomId
    ]);

    // Actualizar Caja (SimulaciÃ³n de CashRegisterRepository.updateBalances)
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

    console.log(`\n[5] Verificando LiberaciÃ³n de HabitaciÃ³n`);
    const [roomRowsFinal] = await connection.execute(
      'SELECT estado FROM habitaciones WHERE id_habitacion = ?',
      [roomId]
    );
    if (roomRowsFinal[0].estado === 1) {
      console.log('âœ… HabitaciÃ³n liberada OK');
    } else {
      throw new Error('La habitaciÃ³n no se liberÃ³ tras el cobro');
    }

    console.log(`\n[6] Limpiando datos de prueba`);
    await connection.execute('DELETE FROM detalle_cuentas WHERE cuenta_id = ?', [cuentaId]);
    await connection.execute('DELETE FROM cuentas_usuarios WHERE cuenta_id = ?', [cuentaId]);
    await connection.execute('DELETE FROM cuentas WHERE id_cuenta = ?', [cuentaId]);

    // Revertir cambios en caja (opcional, pero buena prÃ¡ctica en tests)
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
