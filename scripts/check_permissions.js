
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
        // 1. Get current logged in users (or just all users to find the cajero)
        const [users] = await connection.execute('SELECT id_usuario, nick, rol_id FROM usuarios');
        console.log('Users:');
        console.table(users);

        const [roles] = await connection.execute('SELECT id_rol, nombre FROM roles');
        console.log('Roles:');
        console.table(roles);

        // 2. Find permissions for Cajero role (usually role 3)
        const [permissions] = await connection.execute(`
        SELECT p.modulo, p.accion 
        FROM permisos p
        JOIN roles_permisos rp ON p.id_permiso = rp.permiso_id
        WHERE rp.rol_id = 3
    `);
        console.log('Permissions for Role 3 (Cajero):');
        console.table(permissions);

        // 3. Specifically look for sales.view
        const hasSalesView = permissions.some(p => p.modulo === 'sales' && p.accion === 'view');
        console.log('Has sales.view?', hasSalesView);

    } catch (e) {
        console.error(e);
    } finally {
        await connection.end();
    }
}

checkUserPermissions();
