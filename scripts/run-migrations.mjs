import 'dotenv/config';
import pg from 'pg';
import postgres from '../lib/database/postgres.cjs';
import { migrate } from './postgres-migrations.mjs';

const plan = process.argv.includes('--plan');
const client = new pg.Client(postgres.connectionConfig());
try {
  await client.connect();
  await migrate(client, { plan });
  console.log(plan ? 'PostgreSQL migration plan complete.' : 'PostgreSQL migrations complete.');
} catch (error) {
  console.error(error);
  process.exitCode = 1;
} finally {
  await client.end();
}
