/* eslint-disable no-console */
const mysql = require('mysql2/promise');
const crypto = require('crypto');
require('dotenv').config();

// Mock de funciones necesarias de db y BaseRepository
const queryMock = async (sql, params = []) => {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
  });
  try {
    const [rows] = await connection.execute(sql.replace(/@/g, ''), params);
    return rows;
  } finally {
    await connection.end();
  }
};

const generateUUID = () => crypto.randomUUID();

const BaseRepository = {
  insert: async (q, table, data) => {
    const keys = Object.keys(data);
    const values = Object.values(data);
    const placeholders = keys.map(() => '?').join(', ');
    const sql = `INSERT INTO ${table} (${keys.join(', ')}) VALUES (${placeholders})`;
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME
    });
    try {
      await connection.execute(sql, values);
    } finally {
      await connection.end();
    }
  },
  update: async (q, table, idCol, id, data) => {
    const keys = Object.keys(data);
    const values = Object.values(data);
    const setClause = keys.map(k => `${k} = ?`).join(', ');
    const sql = `UPDATE ${table} SET ${setClause} WHERE ${idCol} = ?`;
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME
    });
    try {
      await connection.execute(sql, [...values, id]);
    } finally {
      await connection.end();
    }
  },
  delete: async (q, table, idCol, id) => {
    const sql = `DELETE FROM ${table} WHERE ${idCol} = ?`;
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME
    });
    try {
      await connection.execute(sql, [id]);
    } finally {
      await connection.end();
    }
  }
};

const getNowInBusinessTimezone = () => new Date();

class CuentaRepository {
  static async getAll(tipo, estado) {
    if (tipo === 'resumen') {
      const result = await queryMock(
        'SELECT SUM(total) as total_por_cobrar FROM cuentas WHERE estado = 1'
      );
      return { total_por_cobrar: result[0]?.total_por_cobrar || 0 };
    }

    let where = 'WHERE c.estado >= 0';
    let params = [];
    if (estado !== undefined) {
      where = 'WHERE c.estado = ?';
      params.push(estado);
    }

    return await queryMock(
      `
            SELECT c.*, CONCAT(cl.nombre, ' ', cl.apellido) as cliente_nombre,
                   h.nombre as habitacion_numero, u.nick as nombre_cajero,
                   (SELECT COUNT(*) FROM detalle_cuentas dc WHERE dc.cuenta_id = c.id_cuenta) as total_detalles
            FROM cuentas c
            LEFT JOIN clientes cl ON c.cliente_id = cl.id_cliente
            LEFT JOIN habitaciones h ON c.habitacion_id = h.id_habitacion
            LEFT JOIN usuarios u ON c.created_by = u.id_usuario
            ${where} ORDER BY c.fecha_crea DESC
        `,
      params
    );
  }

  static async getById(id) {
    const res = await queryMock(
      `
            SELECT c.*, CONCAT(cl.nombre, ' ', cl.apellido) as cliente_nombre, h.nombre as habitacion_numero,
                   u.nick as nombre_cajero
            FROM cuentas c
            LEFT JOIN clientes cl ON cl.id_cliente = c.cliente_id
            LEFT JOIN habitaciones h ON h.id_habitacion = c.habitacion_id
            LEFT JOIN usuarios u ON u.id_usuario = c.created_by
            WHERE c.id_cuenta = ?
        `,
      [id]
    );

    if (res.length === 0) return null;

    const detalles = await queryMock(
      `
            SELECT DC.*, PR.nombre AS producto
            FROM detalle_cuentas DC 
            LEFT JOIN productos PR ON PR.id_producto = DC.producto_id
            WHERE DC.cuenta_id = ?
        `,
      [id]
    );

    const usuarios = await queryMock(
      `
            SELECT cu.*, u.nick as usuario_nombre
            FROM cuentas_usuarios cu
            LEFT JOIN usuarios u ON u.id_usuario = cu.usuario_id
            WHERE cu.cuenta_id = ?
        `,
      [id]
    );

    return { ...res[0], detalles, usuarios };
  }

  static async create(body, createdBy) {
    const id = generateUUID();
    const now = getNowInBusinessTimezone();
    await BaseRepository.insert(null, 'cuentas', {
      id_cuenta: id,
      codigo: body.codigo,
      cliente_id: body.cliente_id || null,
      total_comision: body.total_comision,
      habitacion_id: body.habitacion_id || null,
      sub_total: body.sub_total,
      total: body.total,
      propina: body.propina || 0,
      fecha_crea: now,
      estado: 1,
      tiempo: body.tiempo || 0,
      created_by: createdBy
    });

    for (const d of body.detalles) {
      const hostesses = d.hostesses || [null];
      for (const hId of hostesses) {
        await queryMock(
          `INSERT INTO detalle_cuentas (id_detalle_cuenta, cuenta_id, producto_id, precio, cantidad, sub_total, comision, hostess_id, fecha_crea, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            generateUUID(),
            id,
            d.producto_id,
            d.precio,
            d.cantidad,
            d.sub_total,
            d.comision,
            hId,
            now,
            createdBy
          ]
        );
      }
    }

    if (body.usuarios?.length) {
      for (const uId of body.usuarios) {
        await queryMock(
          `INSERT INTO cuentas_usuarios (id_cuenta_usuario, cuenta_id, usuario_id) VALUES (?, ?, ?)`,
          [generateUUID(), id, uId]
        );
      }
    }
    return await this.getById(id);
  }

  static async delete(id) {
    await BaseRepository.delete(null, 'detalle_cuentas', 'cuenta_id', id);
    await BaseRepository.delete(null, 'cuentas_usuarios', 'cuenta_id', id);
    await BaseRepository.delete(null, 'cuentas', 'id_cuenta', id);
  }
}

async function runTests() {
  console.log('--- INICIANDO PRUEBAS UNITARIAS: CuentaRepository ---');
  let connection;
  try {
    connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME
    });

    console.log('\n[1] Probando getAll(resumen)...');
    const resumen = await CuentaRepository.getAll('resumen');
    console.log('Resumen result:', resumen);
    if (resumen && typeof resumen.total_por_cobrar === 'number') {
      console.log('âœ… getAll(resumen) OK');
    }

    console.log('\n[2] Probando getAll(listado)...');
    const listado = await CuentaRepository.getAll();
    console.log(`Cuentas encontradas: ${listado.length}`);
    if (Array.isArray(listado)) {
      console.log('âœ… getAll(listado) OK');
    }

    console.log('\n[3] Probando ciclo de vida (create/getById/delete)...');
    const [users] = await connection.execute(
      'SELECT id_usuario FROM usuarios WHERE estado = 1 LIMIT 1'
    );
    const [clients] = await connection.execute('SELECT id_cliente FROM clientes LIMIT 1');
    const [products] = await connection.execute(
      'SELECT id_producto, precio FROM productos LIMIT 1'
    );

    const userId = users[0]?.id_usuario || generateUUID();
    const clientId = clients[0]?.id_cliente || null;
    const productId = products[0]?.id_producto || generateUUID();
    const productPrice = products[0]?.precio || 1000;

    const testCode = 'C-' + Math.random().toString(36).substring(2, 8).toUpperCase();

    const newCuenta = await CuentaRepository.create(
      {
        codigo: testCode,
        cliente_id: clientId,
        total_comision: 500,
        sub_total: productPrice,
        total: productPrice,
        detalles: [
          {
            producto_id: productId,
            precio: productPrice,
            cantidad: 1,
            sub_total: productPrice,
            comision: 500
          }
        ]
      },
      userId
    );

    const testId = newCuenta.id_cuenta;
    console.log(`Cuenta creada: ${testId} (${testCode})`);

    const cuenta = await CuentaRepository.getById(testId);
    if (cuenta && cuenta.codigo === testCode) {
      console.log('âœ… getById() OK');
      if (cuenta.detalles.length > 0) {
        console.log('âœ… Detalles persistidos OK');
      }
    } else {
      throw new Error('No se pudo recuperar la cuenta creada o el cÃ³digo no coincide');
    }

    await CuentaRepository.delete(testId);
    const cuentaEliminada = await CuentaRepository.getById(testId);
    if (!cuentaEliminada) {
      console.log('âœ… delete() OK');
    } else {
      throw new Error('La cuenta no fue eliminada correctamente');
    }

    console.log('\n--- PRUEBAS UNITARIAS COMPLETADAS CON Ã‰XITO ---');
  } catch (error) {
    console.error('\nâŒ ERROR:', error);
    process.exit(1);
  } finally {
    if (connection) await connection.end();
  }
}

runTests();
