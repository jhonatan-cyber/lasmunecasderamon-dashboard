// Tuple-shaped test harness retained for the existing integration assertions.
// All SQL passed here must already use PostgreSQL syntax.
const { Client } = require('pg');
const { connectionConfig, prepareQuery } = require('../lib/database/postgres.cjs');
async function createConnection(config = {}) {
  if (!String(config.database || process.env.DB_NAME).endsWith('_test'))
    throw new Error('Integration tests require a database ending in _test');
  const client = new Client({ ...connectionConfig(), ...config });
  await client.connect();
  const execute = async (sql, params = []) => {
    const result = await client.query(prepareQuery(sql, params));
    return [
      result.command === 'SELECT' || result.fields.length
        ? result.rows
        : { affectedRows: result.rowCount },
      result.fields
    ];
  };
  return {
    query: execute,
    execute,
    end: () => client.end(),
    beginTransaction: () => client.query('BEGIN'),
    commit: () => client.query('COMMIT'),
    rollback: () => client.query('ROLLBACK')
  };
}
module.exports = { createConnection };
