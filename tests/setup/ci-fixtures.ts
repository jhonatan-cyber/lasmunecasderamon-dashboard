import { Client } from 'pg';

/** Semilla ficticia para CI: jamás modifica la base del dashboard. */
export default async function seedCiDatabase() {
  const database = process.env.DB_NAME || '';
  const host = process.env.DB_HOST || '127.0.0.1';
  if (
    process.env.CI !== 'true' ||
    database !== 'lasmunecasderamon_test' ||
    !['localhost', '127.0.0.1', '::1'].includes(host)
  ) {
    throw new Error('La semilla de revisión solo se permite en una base local aislada.');
  }
  const client = new Client({
    host,
    port: Number(process.env.DB_PORT || 5432),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database
  });
  await client.connect();
  try {
    const { rows: roles } = await client.query(
      "SELECT id_rol, LOWER(nombre) AS nombre FROM roles WHERE LOWER(nombre) IN ('anfitriona', 'garzon', 'cajero', 'barman')"
    );
    for (const role of roles) {
      await client.query(
        `INSERT INTO usuarios
        (id_usuario, run, nick, nombre, apellido, direccion, telefono, estado_civil, afp, aporte, sueldo, password, rol_id, estado, fecha_crea)
        SELECT $1, $2, $3, 'Prueba', $4, 'Fixture', '000000000', 'Fixture', 'Fixture', 5000, 50000, password, $5, 1, now()
        FROM usuarios WHERE nick = 'Admin' LIMIT 1
        ON CONFLICT (id_usuario) DO NOTHING`,
        [
          `review-${role.nombre}`,
          `REVIEW-${role.nombre}`,
          `Review-${role.nombre}`,
          role.nombre,
          role.id_rol
        ]
      );
    }
    await client.query(`INSERT INTO clientes (id_cliente, run, nombre, apellido, telefono, fecha_crea, estado, saldo)
      VALUES ('review-cliente', 'REVIEW-CLIENTE', 'Cliente', 'Prueba', '000000000', now(), 1, 0)
      ON CONFLICT (id_cliente) DO NOTHING`);
    if (process.env.CI_LEGACY_FIXTURES === 'true') {
      // Legacy flows require an open cash register, an available room and a product.
      await client.query(`INSERT INTO categorias (id_categoria, nombre, fecha_crea)
        VALUES ('ci-categoria', 'Categoria de pruebas', now()) ON CONFLICT DO NOTHING`);
      await client.query(`INSERT INTO productos
        (id_producto, codigo, nombre, categoria_id, precio, comision, fecha_crea)
        VALUES ('ci-producto', 'CI-PRODUCTO', 'Producto de pruebas', 'ci-categoria', 10000, 1000, now())
        ON CONFLICT DO NOTHING`);
      await client.query(`INSERT INTO habitaciones
        (id_habitacion, nombre, precio, tiempo, comision_anfitriona, estado, fecha_crea)
        VALUES ('ci-habitacion', 'Habitacion de pruebas', 50000, 60, 5000, 1, now())
        ON CONFLICT DO NOTHING`);
      await client.query(`INSERT INTO cajas
        (id_caja, fecha_apertura, usuario_id_apertura, monto_apertura, monto_cierre, efectivo, tarjeta, estado)
        SELECT 'ci-caja', now(), id_usuario, 0, 0, 0, 0, 1 FROM usuarios WHERE nick='Admin'
        ON CONFLICT DO NOTHING`);
    }
  } finally {
    await client.end();
  }
}
