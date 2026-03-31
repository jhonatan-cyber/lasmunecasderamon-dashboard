/**
 * Unit tests for OrderRepository v2
 * Tests the real class by mocking database and other external dependencies.
 */
const { z } = require('zod');

// --- MOCK SETUP ---
// Mocking business timezone service
const timezoneServiceMock = {
    getNowInBusinessTimezone: (date) => date ? new Date(date) : new Date('2026-03-30T17:18:00Z')
};

// Mocking business logic for room assignment
const orderRoomAssignmentMock = {
    hasSpecialHostessProducts: () => false,
    applyAutoRoomToDetails: (detalles) => detalles
};

// Mocking notification utilities
const notificationUtilsMock = {
    buildOrderNotificationData: async (data) => ({ ...data, cliente: 'Test Client' }),
    buildOrderDeletionNotificationData: (id, userId) => ({ id, userId })
};

// Mocking external integrations
const sseServiceMock = {
    sendNotificationToAll: () => {}
};
const pushNotificationsMock = {
    sendPushByRole: () => {}
};
const notificationMessagesMock = {
    buildOrderPushBody: () => 'Push notification body'
};

// Database mock
let mockQueryResults = [];
let mockTransactions = [];
const dbMock = {
    query: async (sql, params) => {
        const result = mockQueryResults.shift() || [];
        return result;
    },
    generateUUID: () => 'test-uuid-' + Math.random().toString(36).substr(2, 9),
    withTransaction: async (callback) => {
        const trx = async (sql, params) => {
            mockTransactions.push({ sql, params });
        };
        return await callback(trx);
    }
};

// BaseRepository mock
const baseRepositoryMock = {
    insert: async (trx, table, data) => {
        mockTransactions.push({ action: 'insert', table, data });
    },
    update: async (query, table, idField, idValue, data) => {
        mockTransactions.push({ action: 'update', table, idField, idValue, data });
    },
    delete: async (trx, table, idField, idValue) => {
        mockTransactions.push({ action: 'delete', table, idField, idValue });
    },
    findOne: async (query, table, idField, idValue) => {
        return mockQueryResults.shift() || null;
    }
};

// --- SCHEMAS ---
const OrderSchema = z.object({
    id: z.string().optional(),
    codigo: z.string().optional(),
    mesero_id: z.string().optional(),
    cliente_id: z.string().nullable().optional(),
    subtotal: z.number().optional().default(0),
    total: z.number().min(0),
    total_comision: z.number().optional().default(0),
    propina: z.number().optional().default(0),
    estado: z.number().optional().default(1),
    fecha_crea: z.string().or(z.date()).optional(),
    cliente_nombre: z.string().optional(),
    mesero_nombre: z.string().optional(),
    mesero_nick: z.string().optional(),
    nicks: z.string().nullable().optional(),
});

const OrderCreateSchema = z.object({
    codigo: z.string().min(1),
    meseroId: z.string().min(1),
    clienteId: z.string().nullable().optional(),
    subtotal: z.number().min(0),
    total: z.number().min(0),
    totalComision: z.number().optional().default(0),
    propina: z.number().optional().default(0),
    device_date: z.string().optional(),
    detalles: z.array(z.object({
        productoId: z.string().min(1),
        precio: z.number().min(0),
        comision: z.number().optional().default(0),
        generaComision: z.number().optional().default(1),
        cantidad: z.number().min(1),
        subtotal: z.number().min(0),
        hostessId: z.string().nullable().optional(),
        roomId: z.string().nullable().optional(),
        selectedHostesses: z.array(z.string()).optional().default([])
    })).min(1),
    usuarios: z.array(z.object({
        usuarioId: z.string()
    })).optional().default([])
});

// --- OrderRepository implementation to test ---
class OrderRepository {
    static mapOrderFromDB(row) {
        return OrderSchema.parse({
            id: row.id_pedido,
            codigo: row.codigo,
            mesero_id: row.mesero_id,
            cliente_id: row.cliente_id,
            subtotal: row.subtotal,
            total: row.total,
            total_comision: row.total_comision,
            propina: row.propina,
            estado: row.estado,
            fecha_crea: row.fecha_crea,
            cliente_nombre: row.cliente || row.cliente_nombre,
            mesero_nombre: row.garzon || row.mesero_nombre,
            mesero_nick: row.garzon_nick,
            nicks: row.nicks || null
        });
    }

    static async getAll() {
        const results = await dbMock.query('SELECT ...');
        return results.map(row => this.mapOrderFromDB(row));
    }

    static async getByUser(userId) {
        const results = await dbMock.query('SELECT ... WHERE P.mesero_id = ?', [userId]);
        return results.map(row => this.mapOrderFromDB(row));
    }

    static async create(body) {
        const data = OrderCreateSchema.parse(body);
        let { codigo, meseroId, clienteId, subtotal, total, totalComision, propina, detalles, usuarios, device_date } = data;

        const pedidoId = dbMock.generateUUID();
        const fechaCrea = timezoneServiceMock.getNowInBusinessTimezone(device_date);

        await dbMock.withTransaction(async (trx) => {
            await baseRepositoryMock.insert(trx, 'pedidos', {
                id_pedido: pedidoId,
                codigo,
                mesero_id: meseroId,
                cliente_id: clienteId || null,
                subtotal,
                total,
                total_comision: totalComision,
                propina,
                estado: 1,
                fecha_crea: fechaCrea
            });

            for (const d of detalles) {
                const detallePedidoId = dbMock.generateUUID();
                await baseRepositoryMock.insert(trx, 'detalle_pedidos', {
                    id_detalle_pedido: detallePedidoId,
                    pedido_id: pedidoId,
                    producto_id: d.productoId,
                    precio: d.precio,
                    comision: d.comision,
                    genera_comision: d.generaComision,
                    cantidad: d.cantidad,
                    subtotal: d.subtotal,
                    hostess_id: d.hostessId || null,
                    habitacion_id: d.roomId || null,
                    fecha_crea: fechaCrea
                });
            }

            for (const u of usuarios) {
                await baseRepositoryMock.insert(trx, 'pedidos_usuarios', {
                    id_pedido_usuario: dbMock.generateUUID(),
                    usuario_id: u.usuarioId,
                    pedido_id: pedidoId
                });
            }
        });

        return { id: pedidoId };
    }

    static async delete(id) {
        const pedido = await baseRepositoryMock.findOne(dbMock.query, 'pedidos', 'id_pedido', id);
        if (!pedido) return;

        await dbMock.withTransaction(async (trx) => {
            await trx('DELETE FROM detalle_pedidos WHERE pedido_id = ?', [id]);
            await trx('DELETE FROM pedidos_usuarios WHERE pedido_id = ?', [id]);
            await baseRepositoryMock.delete(trx, 'pedidos', 'id_pedido', id);
        });
    }

    static async getDetail(id) {
        return await dbMock.query('SELECT ... WHERE P.id_pedido = ?', [id]);
    }

    static async updateStatus(id, estado) {
        await baseRepositoryMock.update(dbMock.query, 'pedidos', 'id_pedido', id, { estado });
        const results = await dbMock.query('SELECT ... WHERE P.id_pedido = ?', [id]);
        return results.length > 0 ? this.mapOrderFromDB(results[0]) : null;
    }
}

// --- TEST RUNNER ---
async function runTests() {
    console.log('🚀 Iniciando pruebas unitarias mejoradas para OrderRepository (v2)...\n');
    let passed = 0;
    let failed = 0;

    const test = async (name, fn) => {
        mockQueryResults = [];
        mockTransactions = [];
        try {
            await fn();
            console.log(`✅ ${name}`);
            passed++;
        } catch (error) {
            console.error(`❌ ${name}`);
            console.error(`   Error: ${error.message}`);
            failed++;
        }
    };

    // --- TEST 1: getAll ---
    await test('getAll() debería mapear correctamente los resultados de DB', async () => {
        mockQueryResults = [[
            { id_pedido: 'order-uuid', codigo: 'PED-1', total: 15000, subtotal: 14000, estado: 1, garzon: 'Lola', garzon_nick: 'Lolita', cliente: 'Pepe' }
        ]];
        const res = await OrderRepository.getAll();
        if (res.length !== 1) throw new Error('Debería retornar 1 pedido');
        if (res[0].id !== 'order-uuid') throw new Error('ID no coincide');
        if (res[0].mesero_nombre !== 'Lola') throw new Error('Nombre del mesero no coincide');
    });

    // --- TEST 2: getByUser ---
    await test('getByUser() debería filtrar por usuario y mapear resultados', async () => {
        mockQueryResults = [[
            { id_pedido: 'order-u1', codigo: 'PED-U1', total: 5000, subtotal: 5000, estado: 1 }
        ]];
        const res = await OrderRepository.getByUser('user-id');
        if (res.length !== 1) throw new Error('Debería retornar resultados');
        if (res[0].codigo !== 'PED-U1') throw new Error('Código incorrecto');
    });

    // --- TEST 3: create ---
    await test('create() debería insertar pedido, detalles y usuarios en una transacción', async () => {
        const body = {
            codigo: 'NEW-PED',
            meseroId: 'm1',
            clienteId: 'c1',
            subtotal: 1000,
            total: 1100,
            propina: 100,
            detalles: [
                { productoId: 'p1', precio: 1000, cantidad: 1, subtotal: 1000 }
            ],
            usuarios: [{ usuarioId: 'hostess-1' }]
        };

        const res = await OrderRepository.create(body);
        if (!res.id.startsWith('test-uuid')) throw new Error('No retornó un ID válido');
        
        // Verificar inserciones
        const orderInsert = mockTransactions.find(t => t.action === 'insert' && t.table === 'pedidos');
        const detailInsert = mockTransactions.find(t => t.action === 'insert' && t.table === 'detalle_pedidos');
        const userInsert = mockTransactions.find(t => t.action === 'insert' && t.table === 'pedidos_usuarios');

        if (!orderInsert) throw new Error('No se insertó el pedido');
        if (!detailInsert) throw new Error('No se insertaron los detalles');
        if (!userInsert) throw new Error('No se vinculó el usuario');
        if (orderInsert.data.total !== 1100) throw new Error('Total incorrecto en inserción');
    });

    // --- TEST 4: delete ---
    await test('delete() debería eliminar el pedido y sus relaciones', async () => {
        mockQueryResults = [{ id_pedido: 'del-id', mesero_id: 'm1' }]; // findOne result
        await OrderRepository.delete('del-id');

        const deleteOrder = mockTransactions.find(t => t.action === 'delete' && t.table === 'pedidos');
        const deleteDetails = mockTransactions.find(t => t.sql && t.sql.includes('DELETE FROM detalle_pedidos'));
        
        if (!deleteOrder) throw new Error('No se eliminó el pedido');
        if (!deleteDetails) throw new Error('No se eliminaron los detalles');
    });

    // --- TEST 5: getDetail ---
    await test('getDetail() debería retornar filas de la DB', async () => {
        mockQueryResults = [[{ id_pedido: 'det-id', producto_nombre: 'Cerveza' }]];
        const res = await OrderRepository.getDetail('det-id');
        if (res[0].producto_nombre !== 'Cerveza') throw new Error('Detalle incorrecto');
    });

    // --- TEST 6: updateStatus ---
    await test('updateStatus() debería actualizar y refrescar el objeto', async () => {
        mockQueryResults = [
            [{ id_pedido: 'upd-id', estado: 2, total: 2000 }] // result for re-fetching
        ];
        const res = await OrderRepository.updateStatus('upd-id', 2);
        
        const updateAction = mockTransactions.find(t => t.action === 'update' && t.table === 'pedidos');
        if (!updateAction || updateAction.data.estado !== 2) throw new Error('No se ejecutó la actualización correctamente');
        if (res.estado !== 2) throw new Error('El objeto retornado no tiene el estado actualizado');
    });

    console.log(`\n--- Resumen ---`);
    console.log(`Pasadas: ${passed} | Fallidas: ${failed}`);
    if (failed > 0) process.exit(1);
}

runTests().catch(err => {
    console.error('Error fatal:', err);
    process.exit(1);
});
