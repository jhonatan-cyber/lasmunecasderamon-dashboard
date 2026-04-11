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

class NotificationRepository {
  static async create(userId, type, titulo, message) {
    const id = generateUUID();
    await queryMock(
      `
      INSERT INTO notificaciones (id, usuario_id, tipo, titulo, mensaje, leida, fecha_crea)
      VALUES (?, ?, ?, ?, ?, 0, NOW())
    `,
      [id, userId, type, titulo, message]
    );
    return id;
  }

  static async getByUser(userId) {
    return await queryMock(
      'SELECT * FROM notificaciones WHERE usuario_id = ? ORDER BY fecha_crea DESC',
      [userId]
    );
  }

  static async markAsRead(id) {
    await queryMock('UPDATE notificaciones SET leida = 1, fecha_leida = NOW() WHERE id = ?', [id]);
  }
}

async function runTests() {
  console.log('--- INICIANDO PRUEBAS UNITARIAS: NotificationRepository ---');
  try {
    const users = await queryMock('SELECT id_usuario FROM usuarios LIMIT 1');
    const userId = users[0].id_usuario;

    console.log('\n[1] Probando create()...');
    const notifId = await NotificationRepository.create(
      userId,
      'info',
      'Test Title',
      'Test notification message'
    );
    console.log(`NotificaciÃ³n creada: ${notifId}`);

    console.log('\n[2] Probando getByUser()...');
    const notifications = await NotificationRepository.getByUser(userId);
    const found = notifications.find(n => n.id === notifId);
    if (found) {
      console.log('âœ… create() y getByUser() OK');
    } else {
      throw new Error('No se encontrÃ³ la notificaciÃ³n creada');
    }

    console.log('\n[3] Probando markAsRead()...');
    await NotificationRepository.markAsRead(notifId);
    const [notif] = await queryMock('SELECT leida FROM notificaciones WHERE id = ?', [notifId]);
    if (notif && notif.leida === 1) {
      console.log('âœ… markAsRead() OK');
    } else {
      throw new Error('La notificaciÃ³n no se marcÃ³ como leÃ­da');
    }

    // Cleanup
    console.log('\n[4] Limpiando datos de prueba...');
    await queryMock('DELETE FROM notificaciones WHERE id = ?', [notifId]);
    console.log('âœ… Cleanup OK');

    console.log('\n--- PRUEBAS UNITARIAS COMPLETADAS CON Ã‰XITO ---');
  } catch (error) {
    console.error('\nâŒ ERROR:', error);
    process.exit(1);
  }
}

runTests();
