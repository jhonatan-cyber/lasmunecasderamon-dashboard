
const mysql = require('mysql2/promise');

async function checkUserPermissions() {
    const connection = await mysql.createConnection({
        host: '127.0.0.1',
        user: 'root',
        password: '',
        database: 'lasmunecasderamon',
        port: 3306
    });

    try {
        const [roles] = await connection.execute('SELECT id_rol, nombre FROM roles');
        const cajeroRole = roles.find(r => r.nombre.toLowerCase() === 'cajero');
        const cajeroRoleId = cajeroRole ? cajeroRole.id_rol : 4;

        const [permissions] = await connection.execute(`
        SELECT p.module, p.action 
        FROM permissions p
        JOIN role_permissions rp ON p.id = rp.permission_id
        WHERE rp.role_id = ?
    `, [cajeroRoleId]);

        console.log(`Permissions for Cajero (Role ${cajeroRoleId}):`);
        console.table(permissions);

        const hasSalesView = permissions.some(p => p.module === 'sales' && p.action === 'view');
        console.log('Has sales.view?', hasSalesView);

    } catch (e) {
        console.error(e);
    } finally {
        await connection.end();
    }
}

checkUserPermissions();
