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
  insert: async (table, data) => {
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
  }
};

const withTransaction = async callback => {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
  });
  try {
    await connection.beginTransaction();
    const result = await callback(connection);
    await connection.commit();
    return result;
  } catch (e) {
    await connection.rollback();
    throw e;
  } finally {
    await connection.end();
  }
};

class TipRepository {
  static async getSummary(isAdmin, userId, cajaActiva) {
    let where = '';
    const params = [];

    if (!isAdmin) {
      where = 'WHERE DP.usuario_id = ?';
      params.push(userId);
    }

    if (cajaActiva) {
      const active = await queryMock(
        'SELECT id_caja FROM cajas WHERE estado = 1 ORDER BY fecha_apertura DESC LIMIT 1'
      );
      if (active.length > 0) {
        where += (where ? ' AND ' : 'WHERE ') + '(V.caja_id = ? OR V.id_venta IS NULL)';
        params.push(active[0].id_caja);
      } else {
        return [];
      }
    }

    const sql = `
      SELECT U.id_usuario, U.nick, CONCAT(U.nombre, ' ', U.apellido) AS nombre_completo,
             MAX(COALESCE(V.fecha_crea, P.fecha_crea)) AS fecha_crea, 
             SUM(DP.monto) AS total_propinas,
             SUM(CASE WHEN DP.estado = 1 THEN DP.monto ELSE 0 END) AS propinas_pendientes,
             SUM(CASE WHEN DP.estado = 0 THEN DP.monto ELSE 0 END) AS propinas_cobradas
      FROM propinas P 
      INNER JOIN detalle_propinas DP ON DP.propina_id = P.id_propina
      INNER JOIN usuarios U ON U.id_usuario = DP.usuario_id
      LEFT JOIN ventas V ON V.id_venta = P.venta_id
      ${where} GROUP BY U.id_usuario ORDER BY total_propinas DESC
    `;
    return await queryMock(sql, params);
  }

  static async getByUser(userId) {
    const sql = `
      SELECT P.id_propina AS propina_id, DP.id_detalle_propina, P.fecha_crea AS fecha_hora, 
             COALESCE(V.fecha_crea, P.fecha_crea) AS fecha_crea, 
             V.codigo AS codigo_venta, DP.monto, V.id_venta AS venta_id,
             DP.estado, CASE WHEN DP.estado = 1 THEN 'Por pagar' ELSE 'Pagado' END AS estado_texto
      FROM propinas P 
      INNER JOIN detalle_propinas DP ON DP.propina_id = P.id_propina
      LEFT JOIN ventas V ON V.id_venta = P.venta_id
      WHERE DP.usuario_id = ? ORDER BY COALESCE(V.fecha_crea, P.fecha_crea) DESC
    `;
    return await queryMock(sql, [userId]);
  }

  static async register(venta_id, monto) {
    const logueados = await queryMock(`
      SELECT DISTINCT u.id_usuario FROM logins l
      INNER JOIN usuarios u ON u.id_usuario = l.usuario_id
      INNER JOIN roles r ON r.id_rol = u.rol_id
      WHERE l.estado = 1 AND l.en_local = 1 AND u.estado = 1 AND r.nombre IN ('cajero', 'garzon')
    `);

    if (logueados.length === 0) throw new Error('No hay usuarios logueados disponibles');

    const montoPorUsuario = monto / logueados.length;
    const now = new Date();
    const id = generateUUID();

    await withTransaction(async trx => {
      const insertWithTrx = async (table, data) => {
        const keys = Object.keys(data);
        const values = Object.values(data);
        const placeholders = keys.map(() => '?').join(', ');
        const sql = `INSERT INTO ${table} (${keys.join(', ')}) VALUES (${placeholders})`;
        await trx.execute(sql, values);
      };

      await insertWithTrx('propinas', {
        id_propina: id,
        venta_id,
        propina: monto,
        estado: 1,
        fecha_crea: now
      });

      for (const u of logueados) {
        await insertWithTrx('detalle_propinas', {
          id_detalle_propina: generateUUID(),
          propina_id: id,
          usuario_id: u.id_usuario,
          monto: montoPorUsuario,
          estado: 1,
          fecha_crea: now
        });
      }
    });

    return { id, montoPorUsuario, count: logueados.length };
  }
}

async function runTests() {
  console.log('--- INICIANDO PRUEBAS UNITARIAS: TIP REPOSITORY ---');

  try {
    const users = await queryMock('SELECT id_usuario, nick FROM usuarios WHERE estado = 1 LIMIT 1');
    if (users.length === 0) throw new Error('No hay usuarios activos para probar');
    const user = users[0];
    console.log(`OK: Usando usuario para pruebas: ${user.nick} (${user.id_usuario})`);

    console.log('PRUEBA 1: register()');

    const loginCheck = await queryMock(
      "SELECT l.id_login FROM logins l INNER JOIN usuarios u ON u.id_usuario = l.usuario_id INNER JOIN roles r ON r.id_rol = u.rol_id WHERE l.estado = 1 AND l.en_local = 1 AND r.nombre IN ('cajero', 'garzon') LIMIT 1"
    );

    if (loginCheck.length === 0) {
      console.log('INFO: No hay nadie logueado, simulando un login para la prueba...');
      const garzonRole = await queryMock(
        "SELECT id_rol FROM roles WHERE LOWER(nombre) = 'garzon' LIMIT 1"
      );
      const userId = user.id_usuario;
      await BaseRepository.insert('logins', {
        id_login: generateUUID(),
        usuario_id: userId,
        fecha_login: new Date(),
        estado: 1,
        en_local: 1,
        token: 'test-token'
      });
    }

    const regResult = await TipRepository.register(null, 5000);
    console.log('OK: Registro de propina exitoso:', regResult);

    console.log('PRUEBA 2: getSummary()');
    const summary = await TipRepository.getSummary(true, null, false);
    console.log(`OK: Resumen obtenido. Filas: ${summary.length}`);
    if (summary.length > 0) {
      console.log('   Ejemplo:', summary[0].nick, '- Total:', summary[0].total_propinas);
    }

    console.log('PRUEBA 3: getByUser()');
    const userTips = await TipRepository.getByUser(user.id_usuario);
    console.log(`OK: Propinas del usuario ${user.nick}: ${userTips.length}`);

    console.log('INFO: Limpiando datos de prueba...');
    await queryMock('DELETE FROM detalle_propinas WHERE propina_id = ?', [regResult.id]);
    await queryMock('DELETE FROM propinas WHERE id_propina = ?', [regResult.id]);

    console.log('\n--- PRUEBAS COMPLETADAS CON ÉXITO ---');
  } catch (error) {
    console.error('\nERROR DURANTE LAS PRUEBAS:', error.message);
    process.exit(1);
  }
}

runTests();
