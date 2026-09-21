require('dotenv').config({ quiet: true });
const { Client } = require('pg');
const { connectionConfig } = require('../lib/database/postgres.cjs');
const args = Object.fromEntries(
  process.argv.slice(2).map(arg => arg.replace(/^--/, '').split('='))
);
const days = Number(args.days || args['min-age'] || 7);
if (!Number.isInteger(days) || days < 1) throw new Error('days must be a positive integer');
(async () => {
  const client = new Client(connectionConfig());
  try {
    await client.connect();
    const dry = Object.hasOwn(args, 'dry-run');
    const sql = dry
      ? 'SELECT count(*)::int AS count FROM query_logs WHERE created_at < now() - make_interval(days => $1)'
      : 'DELETE FROM query_logs WHERE created_at < now() - make_interval(days => $1)';
    const result = await client.query(sql, [days]);
    if (!Object.hasOwn(args, 'quiet'))
      console.log(dry ? 'Would delete: ' + result.rows[0].count : 'Deleted: ' + result.rowCount);
  } finally {
    await client.end();
  }
})().catch(error => {
  console.error(error.message);
  process.exitCode = 1;
});
