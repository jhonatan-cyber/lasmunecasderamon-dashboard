import { spawn } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
process.chdir(ROOT);

const env = Object.assign({}, process.env, {
  DB_HOST: '127.0.0.1',
  DB_PORT: '5432',
  DB_USER: 'postgres',
  DB_PASSWORD: '',
  DB_NAME: 'lasmunecasderamon'
});

const child = spawn(
  'powershell',
  [
    '-NoProfile',
    '-Command',
    `[Environment]::SetEnvironmentVariable(${JSON.stringify('DB_PASSWORD')},${JSON.stringify('')},${JSON.stringify('Process')}); node ${join(ROOT, 'scripts', 'ci-setup-db.js')}`
  ],
  { env, stdio: ['ignore', 'inherit', 'inherit'], timeout: 180000, cwd: ROOT }
);

child.on('exit', code => process.exit(code ?? 1));
child.on('error', err => {
  console.error(err);
  process.exit(1);
});
