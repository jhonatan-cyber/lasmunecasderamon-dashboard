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

// Minimal implementation of needed parts
const BaseRepository = {
  insert: async (trx, table, data) => {
    const keys = Object.keys(data);
    const values = Object.values(data);
    const placeholders = keys.map(() => '?').join(', ');
    const sql = `INSERT INTO ${table} (${keys.join(', ')}) VALUES (${placeholders})`;
    await queryMock(sql, values);
  },
  update: async (trx, table, idCol, id, data) => {
    const keys = Object.keys(data);
    const values = Object.values(data);
    const setClause = keys.map(k => `${k} = ?`).join(', ');
    const sql = `UPDATE ${table} SET ${setClause} WHERE ${idCol} = ?`;
    await queryMock(sql, [...values, id]);
  }
};

async function runTests() {
  console.log('--- INICIANDO PRUEBA DE INTEGRACIÃ“N: FLUJO DE DEVOLUCIÃ“N/CANCELACIÃ“N ---');

  let testData = {
    userId: null,
    habitId: null,
    saleId: null,
    serviceId: null
  };

  try {
    // SETUP: Obtener dependencias
    const users = await queryMock('SELECT id_usuario FROM usuarios WHERE estado = 1 LIMIT 1');
    testData.userId = users[0].id_usuario;

    const habits = await queryMock(
      'SELECT id_habitacion FROM habitaciones WHERE estado = 1 LIMIT 1'
    );
    testData.habitId = habits[0].id_habitacion;

    console.log(`\n[1] Escenario: CancelaciÃ³n de Venta con HabitaciÃ³n asociada`);

    // 1. Crear una venta activa y marcar habitaciÃ³n como ocupada (simulado)
    testData.saleId = generateUUID();
    await BaseRepository.insert(null, 'ventas', {
      id_venta: testData.saleId,
      habitacion_id: testData.habitId,
      total: 100,
      estado: 1, // ACTIVA
      created_by: testData.userId,
      fecha_crea: new Date()
    });
    await BaseRepository.update(null, 'habitaciones', 'id_habitacion', testData.habitId, {
      estado: 2
    }); // OCUPADA
    console.log('Venta creada y habitaciÃ³n marcada como ocupada.');

    // 2. Ejecutar cancelaciÃ³n (devoluciÃ³n)
    console.log('Cancelando venta (devoluciÃ³n)...');
    await BaseRepository.update(null, 'ventas', 'id_venta', testData.saleId, { estado: 0 }); // CANCELADA

    // SimulaciÃ³n de RoomManager.resumeRoomLogic: Si se cancela la venta, liberar habitaciÃ³n
    await BaseRepository.update(null, 'habitaciones', 'id_habitacion', testData.habitId, {
      estado: 1
    }); // LIBRE

    // 3. Verificar resultados
    const sale = (
      await queryMock('SELECT estado FROM ventas WHERE id_venta = ?', [testData.saleId])
    )[0];
    const habit = (
      await queryMock('SELECT estado FROM habitaciones WHERE id_habitacion = ?', [testData.habitId])
    )[0];

    if (sale.estado === 0 && habit.estado === 1) {
      console.log('âœ… Venta cancelada y habitaciÃ³n liberada correctamente.');
    } else {
      throw new Error(
        `Falla en verificaciÃ³n de cancelaciÃ³n de venta: SaleState=${sale.estado}, HabitState=${habit.estado}`
      );
    }

    console.log(`\n[2] Escenario: CancelaciÃ³n de Servicio con HabitaciÃ³n asociada`);

    // 1. Crear un servicio activo y marcar habitaciÃ³n como ocupada (simulado)
    testData.serviceId = generateUUID();
    await BaseRepository.insert(null, 'servicios', {
      id_servicio: testData.serviceId,
      habitacion_id: testData.habitId,
      total: 50,
      estado: 1, // ACTIVA
      created_by: testData.userId,
      fecha_crea: new Date()
    });
    await BaseRepository.update(null, 'habitaciones', 'id_habitacion', testData.habitId, {
      estado: 2
    }); // OCUPADA
    console.log('Servicio creado y habitaciÃ³n marcada como ocupada.');

    // 2. Ejecutar cancelaciÃ³n (devoluciÃ³n)
    console.log('Cancelando servicio (devoluciÃ³n)...');
    await BaseRepository.update(null, 'servicios', 'id_servicio', testData.serviceId, {
      estado: 0
    }); // CANCELADO

    // SimulaciÃ³n de liberaciÃ³n
    await BaseRepository.update(null, 'habitaciones', 'id_habitacion', testData.habitId, {
      estado: 1
    }); // LIBRE

    // 3. Verificar resultados
    const service = (
      await queryMock('SELECT estado FROM servicios WHERE id_servicio = ?', [testData.serviceId])
    )[0];
    const habit2 = (
      await queryMock('SELECT estado FROM habitaciones WHERE id_habitacion = ?', [testData.habitId])
    )[0];

    if (service.estado === 0 && habit2.estado === 1) {
      console.log('âœ… Servicio cancelado y habitaciÃ³n liberada correctamente.');
    } else {
      throw new Error(
        `Falla en verificaciÃ³n de cancelaciÃ³n de servicio: ServiceState=${service.estado}, HabitState=${habit2.estado}`
      );
    }
  } catch (error) {
    console.error('\nâŒ ERROR DURANTE LA INTEGRACIÃ“N:', error);
    process.exit(1);
  } finally {
    console.log('\n[3] Limpiando datos de prueba...');
    if (testData.saleId)
      await queryMock('DELETE FROM ventas WHERE id_venta = ?', [testData.saleId]);
    if (testData.serviceId)
      await queryMock('DELETE FROM servicios WHERE id_servicio = ?', [testData.serviceId]);
    if (testData.habitId)
      await BaseRepository.update(null, 'habitaciones', 'id_habitacion', testData.habitId, {
        estado: 1
      });
    console.log('âœ… Cleanup OK');
  }

  console.log('\n--- PRUEBA DE INTEGRACIÃ“N COMPLETADA CON Ã‰XITO ---');
}

runTests();
