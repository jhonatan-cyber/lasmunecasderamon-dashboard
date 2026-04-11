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

class ErrorLogRepository {
    static async getAll() {
        return await queryMock('SELECT * FROM error_logs ORDER BY fecha_crea DESC LIMIT 50');
    }

    static async log(data) {
        const id = generateUUID();
        const now = new Date();
        const sql = 'INSERT INTO error_logs (id, endpoint, error_message, stack_trace, request_body, fecha_crea) VALUES (?, ?, ?, ?, ?, ?)';
        const connection = await mysql.createConnection({
            host: process.env.DB_HOST,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            database: process.env.DB_NAME
        });
        try {
            await connection.execute(sql, [
                id,
                data.endpoint ?? 'unknown',
                data.error_message ?? 'unknown error',
                data.stack_trace ?? null,
                data.request_body ?? null,
                now
            ]);
        } finally {
            await connection.end();
        }
    }
}

async function testErrorLogRepository() {
    console.log('--- PRUEBAS UNITARIAS: ErrorLogRepository ---');
    try {
        console.log('Probando log()...');
        const testError = {
            endpoint: '/api/test-error',
            error_message: 'Mensaje de error de prueba ' + Math.random().toString(36).substring(7),
            stack_trace: 'Error: Mensaje de error de prueba\n    at test (test.js:1:1)',
            request_body: JSON.stringify({ key: 'value' })
        };
        await ErrorLogRepository.log(testError);
        console.log('Log registrado con Ã©xito.');

        console.log('Probando getAll()...');
        const logs = await ErrorLogRepository.getAll();
        const createdLog = logs.find(l => l.error_message === testError.error_message);
        if (!createdLog) throw new Error('El log creado no se encontrÃ³ en la lista');
        console.log('âœ… getAll() OK');

        console.log('Limpiando datos de prueba...');
        const connection = await mysql.createConnection({
            host: process.env.DB_HOST,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            database: process.env.DB_NAME
        });
        try {
            await connection.execute('DELETE FROM error_logs WHERE error_message = ?', [testError.error_message]);
        } finally {
            await connection.end();
        }
        console.log('Limpieza completada.');

        console.log('PRUEBAS UNITARIAS ErrorLogRepository COMPLETADAS CON Ã‰XITO');
    } catch (error) {
        console.error('ERROR EN PRUEBAS UNITARIAS:', error);
        process.exit(1);
    }
}

testErrorLogRepository();

