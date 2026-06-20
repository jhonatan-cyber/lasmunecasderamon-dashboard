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

class ServiceRequestRepository {
  static async getAll(estado) {
    let sql = `
      SELECT ss.*, CONCAT(u_sol.nombre, ' ', u_sol.apellido) as solicitado_por_nombre, u_sol.nick as solicitado_por_nick, 
             CONCAT(c.nombre, ' ', c.apellido) as cliente_nombre, h.nombre as habitacion_nombre
      FROM solicitudes_servicios ss
      LEFT JOIN usuarios u_sol ON ss.solicitado_por = u_sol.id_usuario
      LEFT JOIN clientes c ON ss.cliente_id = c.id_cliente
      LEFT JOIN habitaciones h ON ss.habitacion_id = h.id_habitacion
    `;
    const params = [];
    if (estado !== undefined) {
      sql += ' WHERE ss.estado = ?';
      params.push(estado);
    }
    sql += ' ORDER BY ss.fecha_solicitud DESC';
    const res = await queryMock(sql, params);
    return res;
  }

  static async create(data, solicitadoPor) {
    const id = generateUUID();
    await queryMock(
      `
      INSERT INTO solicitudes_servicios 
      (id_solicitud, cliente_id, habitacion_id, precio_servicio, precio_habitacion, comision_anfitriona, anfitrionas_ids, 
       num_clientes, metodo_pago, tiempo, total, iva, solicitado_por, codigo, estado, fecha_solicitud) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, NOW())
    `,
      [
        id,
        data.cliente_id || null,
        data.habitacion_id,
        data.precio_servicio || 0,
        data.precio_habitacion || 0,
        data.comision_anfitriona || 0,
        JSON.stringify(data.anfitrionas_ids || []),
        data.num_clientes || 1,
        data.metodo_pago || 'efectivo',
        data.tiempo || 0,
        data.total || 0,
        data.iva || 0,
        solicitadoPor,
        data.codigo || null
      ]
    );
    return id;
  }

  static async getPendingCount() {
    const res = await queryMock(
      'SELECT COUNT(*) as count FROM solicitudes_servicios WHERE estado = 0'
    );
    return res[0]?.count || 0;
  }

  static async delete(id) {
    await queryMock('DELETE FROM solicitudes_servicios WHERE id_solicitud = ?', [id]);
  }
}

async function runTests() {
  console.log('--- INICIANDO PRUEBAS UNITARIAS: ServiceRequestRepository ---');
  try {
    const users = await queryMock('SELECT id_usuario FROM usuarios LIMIT 1');
    const userId = users[0]?.id_usuario;
    const habits = await queryMock('SELECT id_habitacion FROM habitaciones LIMIT 1');
    const habitId = habits[0]?.id_habitacion;

    if (!userId || !habitId)
      throw new Error('Se requiere un usuario y una habitacion en la DB para las pruebas');

    console.log('\n[1] Probando create()...');
    const testData = {
      habitacion_id: habitId,
      precio_servicio: 50000,
      total: 50000,
      anfitrionas_ids: [userId]
    };
    const requestId = await ServiceRequestRepository.create(testData, userId);
    console.log(`Solicitud creada con ID: ${requestId}`);

    console.log('\n[2] Probando getPendingCount()...');
    const count = await ServiceRequestRepository.getPendingCount();
    console.log(`Solicitudes pendientes: ${count}`);
    if (count > 0) {
      console.log('✅ getPendingCount() OK');
    } else {
      throw new Error('La cuenta de pendientes debería ser mayor a 0');
    }

    console.log('\n[3] Probando getAll()...');
    const all = await ServiceRequestRepository.getAll(0);
    const found = all.find(s => s.id_solicitud === requestId);
    if (found) {
      console.log('✅ getAll() OK');
    } else {
      throw new Error('No se pudo encontrar la solicitud recién creada en getAll()');
    }

    
    console.log('\n[4] Limpiando datos de prueba...');
    await ServiceRequestRepository.delete(requestId);
    console.log('✅ delete() OK');

    console.log('\n--- PRUEBAS UNITARIAS COMPLETADAS CON ÉXITO ---');
  } catch (error) {
    console.error('\nâŒ ERROR:', error);
    process.exit(1);
  }
}

runTests();
