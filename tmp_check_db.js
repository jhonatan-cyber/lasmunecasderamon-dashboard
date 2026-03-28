
const { query } = require('./lib/database/db');

async function test() {
  try {
    const users = await query('SELECT DISTINCT role FROM usuarios');
    console.log('Roles found:', users);
    
    const count = await query('SELECT COUNT(*) as total FROM horas_extras');
    console.log('Total overtime records:', count);
    
    const sample = await query('SELECT * FROM horas_extras LIMIT 1');
    console.log('Sample overtime:', sample);
  } catch (err) {
    console.error('Error:', err);
  }
}

test();
