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
        const keys = Object.keys(data).filter(k => data[k] !== undefined);
        const values = keys.map(k => data[k]);
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

class GratificacionRepository {
    static async getAll() {
        return await queryMock('SELECT * FROM gratificaciones ORDER BY fecha_crea DESC');
    }

    static async getById(id) {
        const res = await queryMock('SELECT * FROM gratificaciones WHERE id = ?', [id]);
        return res[0] || null;
    }

    static async create(data) {
        const id = generateUUID();
        await BaseRepository.insert(null, 'gratificaciones', {
            id,
            usuario_id: data.usuario_id,
            monto: data.monto,
            descripcion: data.descripcion || '',
            estado: 1,
            fecha_hora: new Date(),
            fecha_crea: new Date()
        });
        return id;
    }

    static async update(id, data) {
        await BaseRepository.update(null, 'gratificaciones', 'id', id, {
            ...data,
            fecha_mod: new Date()
        });
    }

    static async delete(id) {
        await BaseRepository.delete(null, 'gratificaciones', 'id', id);
    }
}

async function runTests() {
    console.log('--- INICIANDO PRUEBAS UNITARIAS: GratificacionRepository ---');
    try {
        const tableCheck = await queryMock("SHOW TABLES LIKE 'gratificaciones'");
        if (tableCheck.length === 0) {
            console.log('âš ï¸ La tabla gratificaciones no existe. Saltando pruebas.');
            return;
        }

        const users = await queryMock('SELECT id_usuario FROM usuarios LIMIT 1');
        const userId = users[0]?.id_usuario;
        if (!userId) throw new Error('No hay usuarios en la DB para probar GratificacionRepository');

        console.log('\n[1] Probando getAll()...');
        const listado = await GratificacionRepository.getAll();
        console.log(`Gratificaciones encontradas: ${listado.length}`);
        if (Array.isArray(listado)) console.log('âœ… getAll() OK');

        console.log('\n[2] Probando ciclo de vida (create/getById/update/delete)...');
        const testId = await GratificacionRepository.create({
            usuario_id: userId,
            monto: 15000,
            descripcion: 'Test Gratificacion'
        });
        console.log(`GratificaciÃ³n creada: ${testId}`);

        const grat = await GratificacionRepository.getById(testId);
        if (grat && Number(grat.monto) === 15000) {
            console.log('âœ… getById() OK');
        } else {
            throw new Error('No se pudo recuperar la gratificaciÃ³n creada');
        }

        await GratificacionRepository.update(testId, { monto: 20000 });
        const gratUpdated = await GratificacionRepository.getById(testId);
        if (gratUpdated && Number(gratUpdated.monto) === 20000) {
            console.log('âœ… update() OK');
        } else {
            throw new Error('No se pudo actualizar la gratificaciÃ³n');
        }

        await GratificacionRepository.delete(testId);
        const gratDeleted = await GratificacionRepository.getById(testId);
        if (!gratDeleted) {
            console.log('âœ… delete() OK');
        } else {
            throw new Error('La gratificaciÃ³n no fue eliminada');
        }

        console.log('\n--- PRUEBAS UNITARIAS COMPLETADAS CON Ã‰XITO ---');
    } catch (error) {
        console.error('\nâŒ ERROR:', error);
        process.exit(1);
    }
}

runTests();

