
const { query } = require('./lib/db');

async function checkSales() {
    try {
        const sales = await query('SELECT id_venta, codigo, caja_id, fecha_crea FROM ventas ORDER BY fecha_crea DESC LIMIT 10');
        console.log('Last 10 sales:', JSON.stringify(sales, null, 2));

        const openCaja = await query('SELECT id_caja, fecha_apertura FROM cajas WHERE estado = 1 ORDER BY fecha_apertura DESC LIMIT 1');
        console.log('Open caja:', JSON.stringify(openCaja, null, 2));

        if (openCaja.length > 0) {
            const salesInCaja = await query('SELECT COUNT(*) as count FROM ventas WHERE caja_id = ?', [openCaja[0].id_caja]);
            console.log('Sales in open caja:', salesInCaja[0].count);
        }
    } catch (e) {
        console.error(e);
    }
}

checkSales();
