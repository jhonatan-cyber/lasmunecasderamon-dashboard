import 'dotenv/config';
import pg from 'pg';
import postgres from '../lib/database/postgres.cjs';
import { migrate } from './postgres-migrations.mjs';
const client = new pg.Client(postgres.connectionConfig());
try {
  await client.connect();
  await migrate(client);
  console.log('PostgreSQL migrations complete.');
} catch (error) {
  console.error(error);
  process.exitCode = 1;
} finally {
  await client.end();
}
