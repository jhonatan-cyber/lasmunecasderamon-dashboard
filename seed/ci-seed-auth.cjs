// Only disposable GitHub Actions databases may receive these credentials.
require('dotenv').config({ quiet: true });
const { Client } = require('pg');
const argon2 = require('argon2');
const { connectionConfig } = require('../lib/database/postgres.cjs');
async function main() {
  const config = connectionConfig();
  if (
    process.env.CI !== 'true' ||
    config.database !== 'lasmunecasderamon_test' ||
    !['localhost', '127.0.0.1', '::1'].includes(config.host)
  ) {
    throw new Error('CI seed requires an isolated local test database.');
  }
  const client = new Client(config);
  await client.connect();
  try {
    const hash = await argon2.hash('CI-Only-Password-2026!');
    const result = await client.query(
      "UPDATE usuarios SET password=$1, estado=1, force_password_change=0 WHERE LOWER(nick)='admin'",
      [hash]
    );
    if (result.rowCount !== 1) throw new Error('Expected exactly one seeded administrator.');
  } finally {
    await client.end();
  }
}
main().catch(error => {
  console.error(error.message);
  process.exitCode = 1;
});
