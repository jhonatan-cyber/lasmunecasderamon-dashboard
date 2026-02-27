
const mysql = require('mysql2/promise');

async function checkSales() {
    const connection = await mysql.createConnection({
        host: '127.0.0.1',
        user: 'root',
        password: '',
        database: 'lasmunecasderamon',
        port: 3306
    });

    try {
        const [sales] = await connection.execute('SELECT id_venta, codigo, caja_id, fecha_crea, total, estado FROM ventas ORDER BY fecha_crea DESC LIMIT 10');
        console.log('Last 10 sales:');
        console.table(sales);

        const [cajas] = await connection.execute('SELECT id_caja, fecha_apertura, estado FROM cajas WHERE estado = 1 ORDER BY fecha_apertura DESC LIMIT 1');
        console.log('\nOpen caja:');
        console.table(cajas);

        if (cajas.length > 0) {
            const [salesInCaja] = await connection.execute('SELECT COUNT(*) as count FROM ventas WHERE caja_id = ?', [cajas[0].id_caja]);
            console.log('\nSales in current open caja:', salesInCaja[0].count);
        } else {
            console.log('\nNo open caja found.');
        }
    } catch (e) {
        console.error(e);
    } finally {
        await connection.end();
    }
}

checkSales();
