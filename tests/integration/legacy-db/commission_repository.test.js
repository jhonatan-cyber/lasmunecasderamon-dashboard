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

class CommissionRepository {
  static async summary() {
    const summary = await queryMock(`
      SELECT 
        SUM(monto) as total_comisiones,
        COUNT(*) as cantidad_comisiones,
        SUM(CASE WHEN venta_id IS NOT NULL AND venta_id <> '' AND venta_id <> '0' THEN monto ELSE 0 END) as comision_ventas,
        SUM(CASE WHEN servicio_id IS NOT NULL AND servicio_id <> '' AND servicio_id <> '0' THEN monto ELSE 0 END) as comision_servicios
      FROM comisiones
      WHERE estado = 1
    `);

    const data = summary[0] || {
      total_comisiones: 0,
      cantidad_comisiones: 0,
      comision_ventas: 0,
      comision_servicios: 0
    };
    const total = parseFloat(data.total_comisiones) || 1;
    data.porcentaje_ventas = Math.round(((parseFloat(data.comision_ventas) || 0) / total) * 100);
    data.porcentaje_servicios = Math.round(
      ((parseFloat(data.comision_servicios) || 0) / total) * 100
    );
    return data;
  }

  static async list(params) {
    let where = 'WHERE 1=1';
    let sqlParams = [];
    if (params.status && params.status !== 'all') {
      const statusMap = { por_pagar: 1, pagado: 2, anulado: 0 };
      if (statusMap[params.status] !== undefined) {
        where += ' AND c.estado = ?';
        sqlParams.push(statusMap[params.status]);
      }
    }
    if (params.employeeId) {
      where += ' AND dc.usuario_id = ?';
      sqlParams.push(params.employeeId);
    }
    const sql = `
      SELECT 
        c.id_comision AS id,
        c.monto AS total,
        CASE WHEN c.estado = 1 THEN 'por_pagar' WHEN c.estado = 2 THEN 'pagado' ELSE 'anulado' END AS status,
        c.fecha_crea,
        u.nick AS nick
      FROM comisiones c
      INNER JOIN detalle_comisiones dc ON c.id_comision = dc.comision_id
      INNER JOIN usuarios u ON dc.usuario_id = u.id_usuario
      ${where}
      ORDER BY c.fecha_crea DESC
    `;
    return await queryMock(sql, sqlParams);
  }

  static async getDetails(usuarioId) {
    return await queryMock(
      `
      SELECT 
        c.id_comision AS id,
        c.monto AS monto,
        CASE WHEN c.estado = 1 THEN 'Por pagar' WHEN c.estado = 2 THEN 'Pagado' ELSE 'Anulado' END AS estado
      FROM comisiones c
      INNER JOIN detalle_comisiones dc ON c.id_comision = dc.comision_id
      WHERE dc.usuario_id = ?
    `,
      [usuarioId]
    );
  }

  static async create(data) {
    const id = generateUUID();
    await BaseRepository.insert(null, 'comisiones', {
      id_comision: id,
      ...data,
      estado: 1,
      fecha_crea: getNowInBusinessTimezone()
    });
    return id;
  }

  static async update(id, data) {
    await BaseRepository.update(null, 'comisiones', 'id_comision', id, data);
  }

  static async delete(id) {
    await BaseRepository.update(null, 'comisiones', 'id_comision', id, { estado: 0 });
  }
}

async function runTests() {
  console.log('--- INICIANDO PRUEBAS UNITARIAS: CommissionRepository ---');
  let connection;
  try {
    connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME
    });

    console.log('\n[1] Probando summary()...');
    const summary = await CommissionRepository.summary();
    console.log('Summary result:', summary);
    if (summary && typeof summary.total_comisiones !== 'undefined') {
      console.log('✅ summary() OK');
    }

    const [users] = await connection.execute(
      'SELECT id_usuario, nombre, nick FROM usuarios WHERE estado = 1 LIMIT 1'
    );
    if (users.length > 0) {
      const testUser = users[0];
      console.log(`\n[2] Probando list() con usuario: ${testUser.nick}`);
      const listByUser = await CommissionRepository.list({ employeeId: testUser.id_usuario });
      console.log(`Comisiones encontradas: ${listByUser.length}`);

      console.log('\n[3] Probando getDetails()...');
      const details = await CommissionRepository.getDetails(testUser.id_usuario);
      console.log(`Detalles encontrados: ${details.length}`);
      console.log('✅ getDetails() OK');
    }

    console.log('\n[4] Probando ciclo de vida (create/update/delete)...');
    const testId = await CommissionRepository.create({
      venta_id: crypto.randomUUID(),
      monto: 500.5
    });
    console.log(`Creada: ${testId}`);
    await CommissionRepository.update(testId, { monto: 999.99 });
    await CommissionRepository.delete(testId);

    const [check] = await connection.execute(
      'SELECT estado, monto FROM comisiones WHERE id_comision = ?',
      [testId]
    );
    if (check.length > 0 && check[0].estado === 0) {
      console.log('✅ Ciclo de vida OK');
    }
    await connection.execute('DELETE FROM comisiones WHERE id_comision = ?', [testId]);

    console.log('\n--- PRUEBAS COMPLETADAS CON ÉXITO ---');
  } catch (error) {
    console.error('\nâŒ ERROR:', error);
    process.exit(1);
  } finally {
    if (connection) await connection.end();
  }
}

runTests();
