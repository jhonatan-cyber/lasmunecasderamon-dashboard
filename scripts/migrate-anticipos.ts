import { spawnSync } from 'node:child_process';
const result = spawnSync(process.execPath, ['scripts/run-migrations.mjs'], { stdio: 'inherit' });
process.exitCode = result.status ?? 1;
