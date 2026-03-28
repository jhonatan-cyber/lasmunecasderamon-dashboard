
const mysql = require('mysql2/promise');

async function checkData() {
  const connection = await mysql.createConnection({
    host: '127.0.0.1',
    user: 'root',
    password: '',
    database: 'lasmunecasderamon',
    port: 3306
  });

  try {
    const [rows] = await connection.execute('SELECT COUNT(*) as count FROM horas_extras');
    console.log('Total horas_extras records:', rows[0].count);
    
    if (rows[0].count > 0) {
      const [all_overtime] = await connection.execute('SELECT * FROM horas_extras');
      console.log('Overtime records:', all_overtime);
      
      const [all_users] = await connection.execute('SELECT id_usuario, nombre, apellido, role FROM usuarios');
      console.log('Users found:', all_users);
    } else {
      console.log('No records found in horas_extras');
      const [users] = await connection.execute('SELECT DISTINCT role FROM usuarios');
      console.log('Roles existing in usuarios:', users);
    }
    
  } catch (err) {
    console.error('Error querying DB:', err);
  } finally {
    await connection.end();
  }
}

checkData();
