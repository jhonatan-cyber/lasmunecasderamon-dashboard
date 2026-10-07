import { DatabaseSync } from 'node:sqlite';
import { mkdirSync, chmodSync } from 'node:fs';
import { dirname } from 'node:path';
import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';

/** Estado persistente cifrado; el archivo nunca contiene JWT o refresh tokens en claro. */
export class OAuthStore {
  private db: DatabaseSync;
  constructor(
    path: string,
    private key: Buffer
  ) {
    if (key.length !== 32) throw new Error('MCP_OAUTH_STORE_KEY debe contener 32 bytes en base64.');
    if (path !== ':memory:') mkdirSync(dirname(path), { recursive: true, mode: 0o700 });
    this.db = new DatabaseSync(path);
    this.db.exec(`PRAGMA journal_mode=WAL;
      CREATE TABLE IF NOT EXISTS oauth_state (
        kind TEXT NOT NULL, id TEXT NOT NULL, data TEXT NOT NULL, expires INTEGER NOT NULL,
        PRIMARY KEY(kind,id)
      );`);
    if (path !== ':memory:') chmodSync(path, 0o600);
  }
  put(kind: string, id: string, value: unknown, expires: number) {
    const iv = randomBytes(12);
    const cipher = createCipheriv('aes-256-gcm', this.key, iv);
    cipher.setAAD(Buffer.from(`${kind}:${id}`));
    const encrypted = Buffer.concat([cipher.update(JSON.stringify(value)), cipher.final()]);
    const data = Buffer.concat([iv, cipher.getAuthTag(), encrypted]).toString('base64');
    this.db.prepare('DELETE FROM oauth_state WHERE expires <= ?').run(Date.now());
    this.db
      .prepare('INSERT OR REPLACE INTO oauth_state VALUES(?,?,?,?)')
      .run(kind, id, data, expires);
  }
  get<T>(kind: string, id: string): T | undefined {
    const row = this.db
      .prepare('SELECT data,expires FROM oauth_state WHERE kind=? AND id=?')
      .get(kind, id);
    if (!row || Number(row.expires) <= Date.now()) return undefined;
    const data = Buffer.from(String(row.data), 'base64');
    const decipher = createDecipheriv('aes-256-gcm', this.key, data.subarray(0, 12));
    decipher.setAAD(Buffer.from(`${kind}:${id}`));
    decipher.setAuthTag(data.subarray(12, 28));
    return JSON.parse(
      Buffer.concat([decipher.update(data.subarray(28)), decipher.final()]).toString()
    ) as T;
  }
  delete(kind: string, id: string) {
    this.db.prepare('DELETE FROM oauth_state WHERE kind=? AND id=?').run(kind, id);
  }
  close() {
    this.db.close();
  }
}
