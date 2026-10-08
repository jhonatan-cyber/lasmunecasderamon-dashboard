import { execFileSync } from 'node:child_process';
import { appendFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

export function classifyChanges(files) {
  const flags = { redis: false, migrations: false, mcp: false };
  for (const file of files) {
    // Shared code and CI/dependency changes conservatively require every suite.
    if (
      /^(app\/api\/|lib\/|modules\/|workflows\/|\.github\/|tests\/setup\/|scripts\/ci-|package\.json$|pnpm-|\.npmrc$|patches\/|next\.config|tsconfig|vitest\.config)/.test(
        file
      )
    ) {
      return { redis: true, migrations: true, mcp: true };
    }
    if (/^(tests\/redis\/|scripts\/redis-|vitest\.redis\.config)/.test(file)) flags.redis = true;
    if (
      /^(migrations\/|scripts\/.*(?:migration|schema|postgres|db)|vitest\.(?:postgres|ci-postgres)\.config|tests\/postgres\/)/.test(
        file
      )
    )
      flags.migrations = true;
    if (/^mcp\//.test(file)) flags.mcp = true;
  }
  return flags;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const head = process.env.CI_DIFF_HEAD;
  const base = process.env.CI_DIFF_BASE;
  let flags = { redis: true, migrations: true, mcp: true };
  if (base && head && !/^0+$/.test(base)) {
    try {
      const files = execFileSync('git', ['diff', '--name-only', '-z', base, head], {
        encoding: 'utf8'
      })
        .split('\0')
        .filter(Boolean);
      flags = classifyChanges(files);
    } catch {
      console.warn('No se pudo calcular el diff: ejecutar todas las suites.');
    }
  }
  for (const [key, value] of Object.entries(flags)) {
    console.log(`${key}=${value}`);
    if (process.env.GITHUB_OUTPUT) appendFileSync(process.env.GITHUB_OUTPUT, `${key}=${value}\n`);
  }
}
