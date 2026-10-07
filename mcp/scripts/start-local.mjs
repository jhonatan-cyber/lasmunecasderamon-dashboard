import { mkdirSync, existsSync, writeFileSync, readFileSync } from 'node:fs';
import { randomBytes } from 'node:crypto';
import { fileURLToPath } from 'node:url';

const directory = fileURLToPath(new URL('../.data/', import.meta.url));
const keyFile = fileURLToPath(new URL('../.data/oauth.key', import.meta.url));
mkdirSync(directory, { recursive: true, mode: 0o700 });
if (!existsSync(keyFile)) {
  writeFileSync(keyFile, randomBytes(32).toString('base64'), { flag: 'wx', mode: 0o600 });
}
process.env.MCP_PUBLIC_URL = 'http://127.0.0.1:3001';
process.env.MCP_BASE_URL = 'http://127.0.0.1:3000';
process.env.MCP_HOST = '127.0.0.1';
process.env.MCP_PORT = '3001';
process.env.MCP_ENABLE_DEV_TOOLS = '0';
process.env.MCP_OAUTH_STORE_KEY = readFileSync(keyFile, 'utf8').trim();
process.env.MCP_OAUTH_DB = fileURLToPath(new URL('../.data/mcp-oauth.sqlite', import.meta.url));
await import('../dist/http.js');
