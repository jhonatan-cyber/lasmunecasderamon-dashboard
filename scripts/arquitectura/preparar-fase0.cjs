/** Datos sintéticos para reproducir integración y E2E en una base exclusiva. */
require('dotenv').config({ quiet: true });
const { Client } = require('pg');
const argon2 = require('argon2');
const { connectionConfig } = require('../../lib/database/postgres.cjs');

async function main() {
  if (
    !['localhost', '127.0.0.1', '::1'].includes(process.env.DB_HOST || '') ||
    !/^lmr_fase0_[a-z0-9_]+_test$/.test(process.env.DB_NAME || '')
  ) {
    throw new Error('Use una base local exclusiva: lmr_fase0_<referencia>_test');
  }
  if (!process.env.TEST_PASSWORD) throw new Error('Defina TEST_PASSWORD para el usuario sintético');
  await require('../postgres-setup.cjs').setup();
  const cliente = new Client(connectionConfig());
  await cliente.connect();
  try {
    await cliente.query('BEGIN');
    const password = await argon2.hash(process.env.TEST_PASSWORD);
    for (const [id, nick, rol] of [
      ['fase0-admin', process.env.TEST_USER || 'fase0_admin', 'administrador'],
      ['fase0-cajero', 'fase0_cajero', 'cajero']
    ]) {
      const { rows } = await cliente.query('SELECT id_rol FROM roles WHERE lower(nombre) = $1', [
        rol
      ]);
      if (rows.length !== 1) throw new Error(`Falta el rol semilla ${rol}`);
      await cliente.query(
        `INSERT INTO usuarios
        (id_usuario, run, nick, nombre, apellido, direccion, telefono, estado_civil,
         afp, aporte, sueldo, descuento, password, rol_id, estado, estado_servicio,
         fecha_crea, force_password_change)
        VALUES ($1, $1, $2, 'Prueba', 'Fase cero', 'Local', '0', 'Soltero', 'n',
                0, 0, 0, $3, $4, 1, 1, now(), 0)
        ON CONFLICT (id_usuario) DO UPDATE SET password = EXCLUDED.password,
          nick = EXCLUDED.nick, estado = 1, force_password_change = 0`,
        [id, nick, password, rows[0].id_rol]
      );
    }
    await cliente.query(`INSERT INTO clientes
      (id_cliente, run, nombre, apellido, fecha_crea, estado, saldo)
      VALUES ('fase0-cliente', 'fase0-cliente', 'Cliente', 'Sintetico', now(), 1, 50000)
      ON CONFLICT (id_cliente) DO NOTHING`);
    await cliente.query(`INSERT INTO cajas
      (id_caja, fecha_apertura, usuario_id_apertura, monto_apertura,
       efectivo, tarjeta, transferencia, monto_cierre, estado)
      VALUES ('fase0-caja', now(), 'fase0-admin', 100000, 100000, 0, 0, 0, 1)
      ON CONFLICT (id_caja) DO UPDATE SET estado = 1`);
    await cliente.query(`INSERT INTO habitaciones
      (id_habitacion, nombre, precio, tiempo, comision_anfitriona, estado, fecha_crea)
      VALUES ('fase0-habitacion', 'Habitacion sintetica', 10000, 30, 1000, 1, now())
      ON CONFLICT (id_habitacion) DO UPDATE SET estado = 1`);
    await cliente.query('COMMIT');
    console.log('Fixtures locales preparados: administrador, cajero, cliente, caja y habitación.');
  } catch (error) {
    await cliente.query('ROLLBACK');
    throw error;
  } finally {
    await cliente.end();
  }
}
main().catch(error => {
  console.error(error.message);
  process.exitCode = 1;
});
