require('dotenv').config({ quiet: true });
const { Client } = require('pg');
const { connectionConfig } = require('../lib/database/postgres.cjs');
(async () => {
  const client = new Client(connectionConfig());
  try {
    await client.connect();
    console.log((await client.query('SELECT version() AS version')).rows[0].version);
  } finally {
    await client.end();
  }
})().catch(error => {
  console.error(error.message);
  process.exitCode = 1;
});
