
const mysql = require('mysql2/promise');

async function debugSales() {
    const connection = await mysql.createConnection({
        host: '127.0.0.1',
        user: 'root',
        password: '',
        database: 'lasmunecasderamon',
        port: 3306
    });

    try {
        // 1. Get open caja
        const [cajas] = await connection.execute('SELECT id_caja FROM cajas WHERE estado = 1 ORDER BY fecha_apertura DESC LIMIT 1');
        const cajaId = cajas.length > 0 ? cajas[0].id_caja : null;
        console.log('Open Caja ID:', cajaId);

        let whereClause = 'WHERE 1=1';
        const params = [];
        if (cajaId) {
            whereClause += ' AND v.caja_id = ?';
            params.push(cajaId);
        }

        // 2. Count
        const countSql = `SELECT COUNT(*) as total FROM ventas v ${whereClause}`;
        const [countResult] = await connection.execute(countSql, params);
        console.log('Count Result:', countResult[0].total);

        // 3. Sales
        const salesSql = `
      SELECT v.id_venta, v.codigo, v.total, v.caja_id
      FROM ventas v 
      ${whereClause}
      ORDER BY v.fecha_crea DESC 
      LIMIT 10 OFFSET 0
    `;
        const [salesResult] = await connection.execute(salesSql, params);
        console.log('Sales Count:', salesResult.length);
        console.table(salesResult);

    } catch (e) {
        console.error(e);
    } finally {
        await connection.end();
    }
}

debugSales();
