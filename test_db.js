const mysql = require('mysql2/promise');

async function run() {
    const c = await mysql.createConnection({
        host: '***REMOVED***',
        user: 'nuwesoft',
        password: '***REMOVED***',
        database: 'lasmunecasderamon'
    });

    try {
        const [rows] = await c.query(`
            SELECT 
                S.id_servicio, 
                S.codigo, 
                S.precio_habitacion,
                S.metodo_pago,
                SS.solicitado_por,
                SS.procesado_por
            FROM servicios S
            LEFT JOIN solicitudes_servicios SS ON SS.codigo = S.codigo
            WHERE S.id_servicio IN (SELECT servicio_id FROM detalle_servicios WHERE usuario_id = 5)
            GROUP BY S.id_servicio
            ORDER BY S.fecha_crea DESC LIMIT 3
        `);
        console.log("Services:", JSON.stringify(rows, null, 2));

        const [solRows] = await c.query('SELECT * FROM solicitudes_servicios ORDER BY id_solicitud DESC LIMIT 3');
        console.log("Sols:", JSON.stringify(solRows, null, 2));
    } catch (e) {
        console.error(e);
    }
    c.end();
}
run();
