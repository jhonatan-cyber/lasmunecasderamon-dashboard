#!/usr/bin/env node

const mysql = require('mysql2/promise');

async function getProcedureCode() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'nuwesoft',
    port: parseInt(process.env.DB_PORT || '3306')
  });

  try {
    const procedures = [
      'add_client',
      'delete_client',
      'get_all_client',
      'get_client_by_id',
      'update_client',
      'get_all_order'
    ];

    for (const proc of procedures) {
      const [result] = await connection.query(`SHOW CREATE PROCEDURE ${proc}`);
      console.log(`\n${'='.repeat(80)}`);
      console.log(`PROCEDURE: ${proc}`);
      console.log('='.repeat(80));
      console.log(result[0]['Create Procedure']);
      console.log('\n');
    }

    await connection.end();
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

getProcedureCode();
