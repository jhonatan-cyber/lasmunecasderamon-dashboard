import { execFileSync } from 'node:child_process';
import { appendFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

const domains = [
  'auth',
  'caja',
  'compras',
  'inventario',
  'ventas',
  'personal',
  'reportes',
  'whatsapp'
];

const all = () => ({
  full: true,
  build: true,
  integration: true,
  e2e: true,
  redis: true,
  migrations: true,
  mcp: true,
  unit: true,
  ...Object.fromEntries(domains.map(domain => [domain, true]))
});

export function classifyChanges(files) {
  const flags = {
    full: false,
    build: false,
    integration: false,
    e2e: false,
    redis: false,
    migrations: false,
    mcp: false,
    unit: false,
    ...Object.fromEntries(domains.map(domain => [domain, false]))
  };

  for (const file of files) {
    // Configuración global, dependencias, infraestructura compartida o seguridad:
    // el impacto no se puede delimitar con fiabilidad, así que ejecutamos todo.
    if (
      /^(\.github\/|tests\/setup\/|scripts\/(ci-|run-affected-unit-tests)|package\.json$|pnpm-|\.npmrc$|patches\/|next\.config|tsconfig|vitest\.config|eslint\.config|playwright\.config|proxy\.ts$|middleware\.ts$|lib\/(auth|api|db|database|middleware|constants\/route-permissions|utils\/env|utils\/logger)|modules\/(identidad|salud)\/)/.test(
        file
      )
    ) {
      return all();
    }

    if (/^migrations\//.test(file) || /^scripts\/.*(?:migration|schema|postgres|db)/.test(file)) {
      return { ...all(), full: true };
    }

    if (/^(tests\/redis\/|scripts\/redis-|vitest\.redis\.config)/.test(file)) flags.redis = true;
    if (/^tests\/postgres\//.test(file) || /^vitest\.(?:postgres|ci-postgres)\.config/.test(file)) {
      flags.integration = true;
      flags.unit = true;
    }
    if (/^tests\/unit\//.test(file)) flags.unit = true;
    if (/^mcp\//.test(file)) {
      flags.mcp = true;
      flags.build = true;
    }
    if (/^tests\/e2e\//.test(file)) flags.e2e = true;
    if (/^tests\/integration\//.test(file)) flags.integration = true;

    const source = `${file}`;
    if (/^(app\/api\/|modules\/|workflows\/)/.test(source)) {
      flags.unit = true;
      flags.build = true;
    }
    if (/^(app\/|components\/|hooks\/|contexts\/|types\/)/.test(source)) {
      flags.unit = true;
      flags.build = true;
    }
    if (/^lib\//.test(source)) {
      flags.unit = true;
      flags.build = true;
    }

    const domain = /caja|cashregister|cierre-caja/i.test(source)
      ? 'caja'
      : /compras|purchases/i.test(source)
        ? 'compras'
        : /inventario|products|categories|bar|transfers/i.test(source)
          ? 'inventario'
          : /ventas|sales|orders|servicios/i.test(source)
            ? 'ventas'
            : /personal|users|attendance|payroll|roles|permissions|advances|overtime/i.test(source)
              ? 'personal'
              : /reports|dashboard|stats|forecast/i.test(source)
                ? 'reportes'
                : /whatsapp|twilio|comunicaciones/i.test(source)
                  ? 'whatsapp'
                  : /auth|login|session|password/i.test(source)
                    ? 'auth'
                    : null;
    if (domain) flags[domain] = true;

    // Cambios en código de dominio implican también validar las rutas completas,
    // pero no requieren migraciones ni levantar todos los servicios auxiliares.
    if (domain && !/^tests\//.test(source)) {
      flags.unit = true;
      flags.build = true;
      if (/^app\/api\//.test(source) || /^modules\//.test(source)) flags.integration = true;
      if (/^(app\/|components\/)/.test(source)) flags.e2e = true;
    }

    if (/^tests\/(?:e2e|integration|postgres|redis)\//.test(source)) flags.build = false;
  }
  return flags;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const head = process.env.CI_DIFF_HEAD;
  let base = process.env.CI_DIFF_BASE;
  let flags = all();
  if (base && /^0+$/.test(base)) {
    try {
      base = execFileSync('git', ['rev-parse', `${head}^`], { encoding: 'utf8' }).trim();
    } catch {
      base = '';
    }
  }
  if (base && head) {
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
