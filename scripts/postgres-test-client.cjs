// Tuple-shaped test harness retained for the existing integration assertions.
// All SQL passed here must already use PostgreSQL syntax.
const { Client } = require('pg');
const { connectionConfig, prepareQuery } = require('../lib/database/postgres.cjs');
async function createConnection(config = {}) {
  const database = String(config.database || process.env.DB_NAME || '');
  const host = String(config.host || process.env.DB_HOST || '127.0.0.1');
  const hostLocal = ['localhost', '127.0.0.1', '::1'].includes(host);
  if (
    !hostLocal ||
    (database !== 'lasmunecasderamon' &&
      !(process.env.CI === 'true' && database === 'lasmunecasderamon_test'))
  )
    throw new Error(
      'Integration tests require a local database: lasmunecasderamon, or lasmunecasderamon_test with CI=true'
    );
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
