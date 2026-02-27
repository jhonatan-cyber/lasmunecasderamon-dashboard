
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
        // Roles mapping check
        const [roles] = await connection.execute('SELECT id_rol as id, nombre FROM roles');
        console.log('Roles:');
        console.table(roles);

        const cajeroRole = roles.find(r => r.nombre.toLowerCase() === 'cajero');
        const cajeroRoleId = cajeroRole ? cajeroRole.id : 4;
        console.log('Cajero Role ID:', cajeroRoleId);

        // Permissions for Cajero role
        const [permissions] = await connection.execute(`
        SELECT p.module, p.action 
        FROM permissions p
        JOIN role_permissions rp ON p.id_permission = rp.permission_id
        WHERE rp.role_id = ?
    `, [cajeroRoleId]);
        console.log(`Permissions for Role ${cajeroRoleId} (${cajeroRole?.nombre}):`);
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
