/* eslint-disable no-console */
const mysql = require('mysql2/promise');
const crypto = require('crypto');
require('dotenv').config();


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
  }
};

const getNowInBusinessTimezone = () => new Date();


class SaleRepository {
  static async getAll(params) {
    if (params.tipo === 'resumen') {
      const sql = `
                SELECT 
                    SUM(total) as total_ventas,
                    SUM(CASE WHEN metodo_pago = 'efectivo' THEN total ELSE 0 END) as efectivo,
                    SUM(CASE WHEN metodo_pago = 'tarjeta' THEN total ELSE 0 END) as tarjeta,
                    SUM(CASE WHEN metodo_pago = 'transferencia' THEN total ELSE 0 END) as transferencia,
                    SUM(CASE WHEN metodo_pago = 'prepago' THEN total ELSE 0 END) as prepago,
                    SUM(propina) as total_propinas
                FROM ventas v
                WHERE v.estado IN (1, 2, 3)
            `;
      const result = await queryMock(sql);
      return { resumen_general: result[0] };
    }

    let where = 'WHERE 1=1';
    let sqlParams = [];
    if (params.estado) {
      where += ' AND v.estado = ?';
      sqlParams.push(params.estado);
    }

    const sql = `
            SELECT v.*,
                c.nombre as cliente_nombre,
                u.nick as staff_nick,
                h.nombre as habitacion_nombre
            FROM ventas v
            LEFT JOIN clientes c ON v.cliente_id = c.id_cliente
            LEFT JOIN usuarios u ON v.created_by = u.id_usuario
            LEFT JOIN habitaciones h ON h.id_habitacion = v.habitacion_id
            ${where}
            ORDER BY v.fecha_crea DESC
            LIMIT ? OFFSET ?
        `;
    const countSql = `SELECT COUNT(*) as count FROM ventas v ${where}`;
    const data = await queryMock(sql, [...sqlParams, parseInt(params.limit || '10'), 0]);
    const count = await queryMock(countSql, sqlParams);

    return {
      data,
      total: count[0]?.count || 0
    };
  }

  static async getById(id) {
    const res = await queryMock(
      `
            SELECT v.*, c.nombre as cliente_nombre, h.nombre as habitacion_nombre,
                   u.nick as cajero_nick, u.nombre as cajero_nombre
            FROM ventas v
            LEFT JOIN clientes c ON c.id_cliente = v.cliente_id
            LEFT JOIN habitaciones h ON h.id_habitacion = v.habitacion_id
            LEFT JOIN usuarios u ON u.id_usuario = v.created_by
            WHERE v.id_venta = ?
        `,
      [id]
    );

    if (res.length === 0) return null;

    const detalles = await queryMock(
      `
            SELECT dv.*, p.nombre as producto_nombre
            FROM detalle_ventas dv
            LEFT JOIN productos p ON p.id_producto = dv.producto_id
            WHERE dv.venta_id = ?
        `,
      [id]
    );

    const usuarios = await queryMock(
      `
            SELECT vu.usuario_id, u.nick, u.nombre as usuario_nombre
            FROM ventas_usuarios vu
            LEFT JOIN usuarios u ON u.id_usuario = vu.usuario_id
            WHERE vu.venta_id = ?
        `,
      [id]
    );

    return {
      ...res[0],
      detalles,
      usuarios
    };
  }

  static async create(data) {
    const id = data.id_venta || generateUUID();
    await BaseRepository.insert(null, 'ventas', {
      ...data,
      id_venta: id,
      fecha_crea: data.fecha_crea || getNowInBusinessTimezone()
    });
    return id;
  }

  static async updateStatus(id, estado) {
    await BaseRepository.update(null, 'ventas', 'id_venta', id, {
      estado,
      fecha_mod: getNowInBusinessTimezone()
    });
    return await this.getById(id);
  }

  static async delete(id) {
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME
    });
    try {
      await connection.execute('DELETE FROM detalle_ventas WHERE venta_id = ?', [id]);
      await connection.execute('DELETE FROM ventas_usuarios WHERE venta_id = ?', [id]);
      await connection.execute('DELETE FROM ventas WHERE id_venta = ?', [id]);
    } finally {
      await connection.end();
    }
  }
}

async function runTests() {
  console.log('--- INICIANDO PRUEBAS UNITARIAS: SaleRepository ---');
  let connection;
  try {
    connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME
    });

    console.log('\n[1] Probando getAll(resumen)...');
    const resumen = await SaleRepository.getAll({ tipo: 'resumen' });
    console.log('Resumen result:', resumen);
    if (resumen && resumen.resumen_general) {
      console.log('✅ getAll(resumen) OK');
    }

    console.log('\n[2] Probando getAll(listado)...');
    const listado = await SaleRepository.getAll({ limit: '5' });
    console.log(`Ventas encontradas: ${listado.data.length}, Total: ${listado.total}`);
    if (Array.isArray(listado.data)) {
      console.log('✅ getAll(listado) OK');
    }

    console.log('\n[3] Probando ciclo de vida (create/getById/updateStatus/delete)...');

    
    const [users] = await connection.execute(
      'SELECT id_usuario FROM usuarios WHERE estado = 1 LIMIT 1'
    );
    const [clients] = await connection.execute('SELECT id_cliente FROM clientes LIMIT 1');
    const [cajas] = await connection.execute(
      'SELECT id_caja FROM cajas ORDER BY fecha_apertura DESC LIMIT 1'
    );

    const userId = users[0]?.id_usuario || generateUUID();
    const clientId = clients[0]?.id_cliente || null;
    const cajaId = cajas[0]?.id_caja || generateUUID();

    const testVentaId = generateUUID();
    const testCode = 'TEST-' + Math.random().toString(36).substring(2, 8).toUpperCase();

    await SaleRepository.create({
      id_venta: testVentaId,
      codigo: testCode,
      cliente_id: clientId,
      metodo_pago: 'efectivo',
      total: 1500,
      sub_total: 1500,
      caja_id: cajaId,
      created_by: userId,
      estado: 1
    });
    console.log(`Venta creada: ${testVentaId} (${testCode})`);

    const venta = await SaleRepository.getById(testVentaId);
    if (venta && venta.codigo === testCode) {
      console.log('✅ getById() OK');
    } else {
      throw new Error('No se pudo recuperar la venta creada o el código no coincide');
    }

    await SaleRepository.updateStatus(testVentaId, 0); 
    const ventaAnulada = await SaleRepository.getById(testVentaId);
    if (ventaAnulada && ventaAnulada.estado === 0) {
      console.log('✅ updateStatus() OK');
    } else {
      throw new Error('No se pudo actualizar el estado de la venta');
    }

    await SaleRepository.delete(testVentaId);
    const ventaEliminada = await SaleRepository.getById(testVentaId);
    if (!ventaEliminada) {
      console.log('✅ delete() OK');
    } else {
      throw new Error('La venta no fue eliminada correctamente');
    }

    console.log('\n--- PRUEBAS UNITARIAS COMPLETADAS CON ÉXITO ---');
  } catch (error) {
    console.error('\nâŒ ERROR:', error);
    process.exit(1);
  } finally {
    if (connection) await connection.end();
  }
}

runTests();
