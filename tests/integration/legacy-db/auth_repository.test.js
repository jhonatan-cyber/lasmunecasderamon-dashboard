/* eslint-disable no-console */
require('../../../scripts/guard-local-db')();
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

class AuthRepository {
  static async loginByQR(qrToken) {
    const users = await queryMock(
      `
      SELECT u.*, r.nombre as rol_nombre 
      FROM usuarios u 
      LEFT JOIN roles r ON u.rol_id = r.id_rol 
      WHERE u.qr_token = ? AND u.estado = 1
    `,
      [qrToken]
    );

    if (users.length === 0) return null;

    const user = users[0];
    const nextQR = crypto.randomBytes(16).toString('hex');
    await queryMock('UPDATE usuarios SET qr_token = ? WHERE id_usuario = ?', [
      nextQR,
      user.id_usuario
    ]);
    return { ...user, qr_token: nextQR };
  }

  static async logout(userId) {
    await queryMock('DELETE FROM logins WHERE usuario_id = ?', [userId]);
  }
}

async function runTests() {
  console.log('--- INICIANDO PRUEBAS UNITARIAS: AuthRepository (QR Flow) ---');
  try {
    const testQR = 'test_qr_' + Math.random().toString(36).substring(7);
    const users = await queryMock('SELECT id_usuario FROM usuarios WHERE estado = 1 LIMIT 1');
    const userId = users[0].id_usuario;

    // Snapshot del estado del usuario para restaurarlo al final y no alterar el seed
    const [userBefore] = await queryMock('SELECT qr_token FROM usuarios WHERE id_usuario = ?', [
      userId
    ]);
    const loginsBefore = await queryMock('SELECT * FROM logins WHERE usuario_id = ?', [userId]);

    await queryMock('UPDATE usuarios SET qr_token = ? WHERE id_usuario = ?', [testQR, userId]);
    console.log(`Token QR configurado para usuario ${userId}.`);

    console.log('\n[1] Probando loginByQR()...');
    const result = await AuthRepository.loginByQR(testQR);
    if (result && result.id_usuario === userId && result.qr_token !== testQR) {
      console.log('✅ loginByQR() OK (Token rotado)');
    } else {
      throw new Error('El login por QR falló o el token no rotó');
    }

    console.log('\n[2] Probando logout()...');
    await queryMock(
      'INSERT INTO logins (id_login, usuario_id, last_login, estado) VALUES (?, ?, NOW(), 1)',
      [generateUUID(), userId]
    );
    await AuthRepository.logout(userId);
    const activeLogins = await queryMock('SELECT * FROM logins WHERE usuario_id = ?', [userId]);
    if (activeLogins.length === 0) {
      console.log('✅ logout() OK');
    } else {
      throw new Error('El logout no eliminó los registros de la tabla logins');
    }

    // Restaurar el estado del seed (logins y qr_token) borrado/modificado por logout()
    await queryMock('UPDATE usuarios SET qr_token = ? WHERE id_usuario = ?', [
      userBefore.qr_token,
      userId
    ]);
    for (const l of loginsBefore) {
      await queryMock(
        'INSERT INTO logins (id_login, usuario_id, last_login, estado, en_local, ip_address) VALUES (?, ?, ?, ?, ?, ?)',
        [l.id_login, l.usuario_id, l.last_login, l.estado, l.en_local || 0, l.ip_address || null]
      );
    }
    console.log('✅ Estado del seed restaurado');

    console.log('\n--- PRUEBAS UNITARIAS COMPLETADAS CON ÉXITO ---');
  } catch (error) {
    console.error('\nâŒ ERROR:', error);
    process.exit(1);
  }
}

runTests();
