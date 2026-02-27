
const mysql = require('mysql2/promise');

async function checkErrors() {
    const connection = await mysql.createConnection({
        host: '127.0.0.1',
        user: 'root',
        password: '',
        database: 'lasmunecasderamon',
        port: 3306
    });

    try {
        const [errors] = await connection.execute('SELECT * FROM error_logs ORDER BY fecha_crea DESC LIMIT 5');
        console.log('Last 5 errors:');
        console.table(errors);
    } catch (e) {
        console.error(e);
    } finally {
        await connection.end();
    }
}

checkErrors();
