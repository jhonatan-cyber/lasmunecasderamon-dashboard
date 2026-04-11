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
    }
};

class SaleRepository {
    static async updateStatus(id, estado) {
        await BaseRepository.update(null, 'ventas', 'id_venta', id, { estado });
        if (estado === 0) {
            await queryMock('UPDATE comisiones SET estado = 0 WHERE venta_id = ?', [id]);
        }
    }

    static async requestAnulacion(id, reason, requestedByNick) {
        const idAnul = generateUUID();
        const token = generateUUID();
        await queryMock(`
            INSERT INTO solicitudes_anulacion (id, venta_id, token, motivo, solicitado_por, estado, fecha_solicitud)
            VALUES (?, ?, ?, ?, ?, 'pendiente', NOW())
        `, [idAnul, id, token, reason, requestedByNick]);
        return idAnul;
    }

    static async processAnulacion(requestId, status) {
        // status en DB: 'confirmada', 'rechazada'
        const dbStatus = status === 'aprobado' ? 'confirmada' : 'rechazada';
        
        if (dbStatus === 'confirmada') {
            const req = await queryMock('SELECT venta_id FROM solicitudes_anulacion WHERE id = ?', [requestId]);
            if (req.length > 0) {
                const ventaId = req[0].venta_id;
                await queryMock('UPDATE ventas SET estado = 0 WHERE id_venta = ?', [ventaId]);
                const v = await queryMock('SELECT cliente_id, total, metodo_pago FROM ventas WHERE id_venta = ?', [ventaId]);
                if (v.length > 0 && v[0].metodo_pago === 'prepago' && v[0].cliente_id) {
                    await queryMock('UPDATE clientes SET saldo = saldo + ? WHERE id_cliente = ?', [v[0].total, v[0].cliente_id]);
                }
            }
        }
        await queryMock('UPDATE solicitudes_anulacion SET estado = ? WHERE id = ?', [dbStatus, requestId]);
    }
}

class ServiceRepository {
    static async updateStatus(id, estado) {
        await BaseRepository.update(null, 'servicios', 'id_servicio', id, { estado });
    }

    static async requestAnulacion(id, reason, requestedByNick) {
        const idAnul = generateUUID();
        const token = generateUUID();
        await queryMock(`
            INSERT INTO solicitudes_anulacion_servicios (id, servicio_id, token, motivo, solicitado_por, estado)
            VALUES (?, ?, ?, ?, ?, 'pendiente')
        `, [idAnul, id, token, reason, requestedByNick]);
        return idAnul;
    }

    static async processAnulacion(requestId, status) {
        const dbStatus = status === 'aprobado' ? 'confirmada' : 'rechazada';
        if (dbStatus === 'confirmada') {
            const req = await queryMock('SELECT servicio_id FROM solicitudes_anulacion_servicios WHERE id = ?', [requestId]);
            if (req.length > 0) {
                const sId = req[0].servicio_id;
                await queryMock('UPDATE servicios SET estado = 0 WHERE id_servicio = ?', [sId]);
            }
        }
        await queryMock('UPDATE solicitudes_anulacion_servicios SET estado = ? WHERE id = ?', [dbStatus, requestId]);
    }
}

async function testRefunds() {
    console.log('--- PRUEBAS UNITARIAS: REEMBOLSOS / ANULACIONES ---');

    let testData = {
        userNick: 'TEST_USER',
        habitId: null,
        saleId: null,
        serviceId: null,
        clientId: null,
        requestIdSale: null,
        requestIdService: null
    };

    try {
        const habits = await queryMock('SELECT id_habitacion FROM habitaciones WHERE estado = 1 LIMIT 1');
        testData.habitId = habits[0].id_habitacion;
        const clients = await queryMock('SELECT id_cliente FROM clientes LIMIT 1');
        testData.clientId = clients[0].id_cliente;

        console.log('\n[1] Test: AnulaciÃ³n de Venta (updateStatus)');
        testData.saleId = generateUUID();
        await BaseRepository.insert(null, 'ventas', {
            id_venta: testData.saleId,
            habitacion_id: testData.habitId,
            total: 100,
            estado: 1,
            created_by: 'system',
            fecha_crea: new Date()
        });
        
        await SaleRepository.updateStatus(testData.saleId, 0);
        
        const sale = (await queryMock('SELECT estado FROM ventas WHERE id_venta = ?', [testData.saleId]))[0];
        if (sale.estado !== 0) throw new Error('La venta no cambiÃ³ a estado 0');
        console.log('âœ… Venta anulada correctamente');

        console.log('\n[2] Test: Proceso de AnulaciÃ³n de Venta (Solicitud + AprobaciÃ³n + Reintegro Prepago)');
        const salePrepagoId = generateUUID();
        const initialBalanceRes = await queryMock('SELECT saldo FROM clientes WHERE id_cliente = ?', [testData.clientId]);
        const initialBalance = Number(initialBalanceRes[0].saldo);

        await BaseRepository.insert(null, 'ventas', {
            id_venta: salePrepagoId,
            cliente_id: testData.clientId,
            total: 50,
            estado: 1,
            metodo_pago: 'prepago',
            created_by: 'system',
            fecha_crea: new Date()
        });
        
        const reqIdSale = await SaleRepository.requestAnulacion(salePrepagoId, 'Error en cobro', testData.userNick);
        testData.requestIdSale = reqIdSale;
        
        await SaleRepository.processAnulacion(reqIdSale, 'aprobado');
        
        const saleP = (await queryMock('SELECT estado FROM ventas WHERE id_venta = ?', [salePrepagoId]))[0];
        const clientP = (await queryMock('SELECT saldo FROM clientes WHERE id_cliente = ?', [testData.clientId]))[0];
        
        if (saleP.estado !== 0) throw new Error('La venta prepago no cambiÃ³ a estado 0');
        if (Number(clientP.saldo) !== initialBalance + 50) throw new Error('No se reintegrÃ³ el saldo al cliente. Saldo actual: ' + clientP.saldo);
        
        console.log('âœ… Solicitud de anulaciÃ³n de venta procesada y saldo reintegrado correctamente');
        await queryMock('DELETE FROM ventas WHERE id_venta = ?', [salePrepagoId]);

        console.log('\n[3] Test: AnulaciÃ³n de Servicio (updateStatus)');
        testData.serviceId = generateUUID();
        await BaseRepository.insert(null, 'servicios', {
            id_servicio: testData.serviceId,
            habitacion_id: testData.habitId,
            total: 200,
            estado: 1,
            created_by: 'system',
            fecha_crea: new Date()
        });
        
        await ServiceRepository.updateStatus(testData.serviceId, 0);
        
        const service = (await queryMock('SELECT estado FROM servicios WHERE id_servicio = ?', [testData.serviceId]))[0];
        if (service.estado !== 0) throw new Error('El servicio no cambiÃ³ a estado 0');
        console.log('âœ… Servicio anulado correctamente');

        console.log('\n[4] Test: Solicitud de AnulaciÃ³n de Servicio');
        const serviceId2 = generateUUID();
        await BaseRepository.insert(null, 'servicios', {
            id_servicio: serviceId2,
            habitacion_id: testData.habitId,
            total: 150,
            estado: 1,
            created_by: 'system',
            fecha_crea: new Date()
        });
        const reqIdService = await ServiceRepository.requestAnulacion(serviceId2, 'Prueba de anulaciÃ³n', testData.userNick);
        testData.requestIdService = reqIdService;
        await ServiceRepository.processAnulacion(reqIdService, 'aprobado');
        const service2 = (await queryMock('SELECT estado FROM servicios WHERE id_servicio = ?', [serviceId2]))[0];
        if (service2.estado !== 0) throw new Error('El servicio 2 no cambiÃ³ a estado 0');
        console.log('âœ… Solicitud de anulaciÃ³n de servicio procesada correctamente');
        await queryMock('DELETE FROM servicios WHERE id_servicio = ?', [serviceId2]);

    } catch (error) {
        console.error('\nâŒ ERROR EN TEST:', error);
        process.exit(1);
    } finally {
        console.log('\nLimpiando datos...');
        if (testData.saleId) await queryMock('DELETE FROM ventas WHERE id_venta = ?', [testData.saleId]);
        if (testData.serviceId) await queryMock('DELETE FROM servicios WHERE id_servicio = ?', [testData.serviceId]);
        if (testData.requestIdSale) await queryMock('DELETE FROM solicitudes_anulacion WHERE id = ?', [testData.requestIdSale]);
        if (testData.requestIdService) await queryMock('DELETE FROM solicitudes_anulacion_servicios WHERE id = ?', [testData.requestIdService]);
        console.log('âœ… Cleanup completo');
    }

    console.log('\n--- TODAS LAS PRUEBAS DE REEMBOLSOS PASARON ---');
}

testRefunds();

