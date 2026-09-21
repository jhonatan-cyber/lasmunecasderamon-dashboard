import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';

const directory = fileURLToPath(new URL('../migrations/', import.meta.url));
export async function migrate(client) {
  await client.query('SELECT pg_advisory_lock(72419001)');
  try {
    await client.query(`CREATE TABLE IF NOT EXISTS _postgres_migrations (
      filename text PRIMARY KEY, checksum text NOT NULL, executed_at timestamptz NOT NULL DEFAULT now()
    )`);
    for (const filename of fs
      .readdirSync(directory)
      .filter(f => f.endsWith('.sql'))
      .sort()) {
      const sql = fs.readFileSync(path.join(directory, filename), 'utf8');
      const checksum = createHash('sha256').update(sql).digest('hex');
      const { rows } = await client.query(
        'SELECT checksum FROM _postgres_migrations WHERE filename = $1',
        [filename]
      );
      if (rows.length) {
        if (rows[0].checksum !== checksum)
          throw new Error(`Applied migration changed: ${filename}`);
        continue;
      }
      await client.query('BEGIN');
      try {
        await client.query(sql);
        await client.query(
          'INSERT INTO _postgres_migrations (filename, checksum) VALUES ($1, $2)',
          [filename, checksum]
        );
        await client.query('COMMIT');
        console.log(`Applied: ${filename}`);
      } catch (error) {
        await client.query('ROLLBACK');
        throw new Error(`Migration failed: ${filename}`, { cause: error });
      }
    }
  } finally {
    await client.query('SELECT pg_advisory_unlock(72419001)');
  }
}
