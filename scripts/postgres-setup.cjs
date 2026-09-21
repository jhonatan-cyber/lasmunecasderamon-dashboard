require('dotenv').config({ quiet: true });
const fs = require('node:fs');
const path = require('node:path');
const { Client } = require('pg');
const { connectionConfig, quoteIdentifier } = require('../lib/database/postgres.cjs');

async function setup() {
  const config = connectionConfig();
  const admin = new Client({ ...config, database: 'postgres' });
  try {
    await admin.connect();
    const { rows } = await admin.query('SELECT 1 FROM pg_database WHERE datname = $1', [
      config.database
    ]);
    if (!rows.length) await admin.query(`CREATE DATABASE ${quoteIdentifier(config.database)}`);
  } finally {
    await admin.end();
  }
  const client = new Client(config);
  try {
    await client.connect();
    const { rows } = await client.query(
      "SELECT count(*)::int AS count FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE'"
    );
    if (!rows[0].count) {
      await client.query(
        fs.readFileSync(path.join(__dirname, '../database/lasmunecasderamon.postgres.sql'), 'utf8')
      );
      console.log('PostgreSQL schema and seed imported.');
    }
    const { migrate } = await import('./postgres-migrations.mjs');
    await migrate(client);
    console.log('PostgreSQL ready. Existing data preserved.');
  } finally {
    await client.end();
  }
}
module.exports = { setup };
