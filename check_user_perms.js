
const mysql = require('mysql2/promise');

const config = {
  host: '127.0.0.1',
  user: 'root',
  password: '',
  database: 'lasmunecasderamon',
  port: 3306,
};

async function check() {
  const connection = await mysql.createConnection(config);
  const userId = '3f9041fd-ed80-4b46-a586-d0d1093592d9';
  
  try {
    const [users] = await connection.query('SELECT * FROM usuarios WHERE id_usuario = ?', [userId]);
    console.log('User Found:', users.length > 0);
    if (users.length > 0) {
      console.log('User Role ID:', users[0].rol_id);
      
      const roleId = users[0].rol_id;
      const [roles] = await connection.query('SELECT * FROM roles WHERE id_rol = ?', [roleId]);
      console.log('Role Name:', roles[0]?.nombre);
      
      const [perms] = await connection.query(`
        SELECT p.module, p.action
        FROM role_permissions rp
        INNER JOIN permissions p ON rp.permission_id = p.id
        WHERE rp.role_id = ? AND p.deleted_at IS NULL
      `, [roleId]);
      
      console.log('Permissions found:', perms.length);
      const advancesPerms = perms.filter(p => p.module === 'advances' || p.module === 'anticipos');
      console.log('Advances Permissions:', JSON.stringify(advancesPerms, null, 2));
    } else {
        // Try searching by number if it was cast
        const [usersIdParsed] = await connection.query('SELECT * FROM usuarios WHERE id_usuario = ?', [parseInt(userId)]);
        console.log('User Found (int):', usersIdParsed.length > 0);
    }
  } catch (err) {
    console.error(err);
  } finally {
    await connection.end();
  }
}

check();

