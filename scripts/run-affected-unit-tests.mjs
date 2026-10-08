import { execFileSync } from 'node:child_process';
import { readdirSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const ROOT = process.cwd();
const DOMAIN_TESTS = {
  auth: ['auth', 'login', 'session', 'password', 'user-permissions', 'permissions-cache'],
  caja: [
    'caja',
    'cashRegister',
    'CashRegister',
    'cierreCaja',
    'cierre-caja',
    'confirmarCierreCaja'
  ],
  compras: ['compras', 'Purchase', 'purchase'],
  inventario: ['inventario', 'products', 'Product', 'Category', 'category', 'containerScan'],
  ventas: ['Sale', 'sales', 'venta', 'orders', 'Order', 'Service', 'cuenta'],
  personal: [
    'payroll',
    'attendance',
    'Attendance',
    'User',
    'user',
    'Role',
    'permissions',
    'biometric'
  ],
  reportes: ['Stats', 'stats', 'Report', 'report', 'Forecast', 'ShiftForecast', 'dashboard'],
  whatsapp: ['whatsapp', 'WhatsApp', 'twilio', 'Twilio']
};
const DIRECT_TESTS = {
  'cash-register': ['CashRegisterRepository', 'CashRegisterService', 'caja', 'cajaDetailsModel'],
  purchases: ['compras', 'PurchaseCodesPanel'],
  products: ['ProductService', 'ProductDetailsModal', 'ProductPhoto'],
  categories: ['CategoryService', 'categories-route-permissions'],
  sales: ['SaleService', 'SaleRepository', 'sales'],
  orders: ['OrderService', 'orders-idempotency', 'orders'],
  attendance: ['AttendanceMasivo', 'attendance', 'marcas-servicio'],
  users: ['UserService', 'UserRepository', 'usersRoute'],
  whatsapp: ['whatsapp', 'WhatsApp', 'twilio', 'Twilio'],
  auth: ['auth-routes', 'AuthService', 'auth', 'session']
};

function walk(dir) {
  const result = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) result.push(...walk(full));
    else if (/\.(test|spec)\.(ts|tsx)$/.test(entry.name)) result.push(full);
  }
  return result;
}

export function selectUnitTests(files, candidates = walk(path.join(ROOT, 'tests', 'unit'))) {
  const changed = files.map(file => file.replaceAll('\\', '/'));
  const selected = new Set();
  const addMatching = patterns => {
    for (const testFile of candidates) {
      const normalized = testFile.replaceAll('\\', '/');
      if (patterns.some(pattern => normalized.toLowerCase().includes(pattern.toLowerCase()))) {
        selected.add(testFile);
      }
    }
  };

  for (const file of changed) {
    if (/^tests\/unit\//.test(file)) {
      if (/\.(test|spec)\.(ts|tsx)$/.test(file)) selected.add(path.join(ROOT, file));
      continue;
    }
    if (/^tests\//.test(file)) continue;

    if (/^app\/api\//.test(file)) {
      const route = file.replace(/^app\/api\//, '').replace(/\/route\.[jt]sx?$/, '');
      const routeName = route
        .split('/')
        .filter(part => !/^\[.*\]$/.test(part))
        .join('/');
      const routeParts = routeName.split('/');
      addMatching([...routeParts, ...(DIRECT_TESTS[routeParts[0]] ?? [])]);
    }

    if (/caja|cashregister|cierre-caja/i.test(file)) addMatching(DOMAIN_TESTS.caja);
    else if (/compras|purchases/i.test(file)) addMatching(DOMAIN_TESTS.compras);
    else if (/inventario|products|categories|transfers|bar/i.test(file))
      addMatching(DOMAIN_TESTS.inventario);
    else if (/ventas|sales|orders|servicios|cuentas/i.test(file)) addMatching(DOMAIN_TESTS.ventas);
    else if (/personal|users|attendance|payroll|roles|permissions|advances|overtime/i.test(file))
      addMatching(DOMAIN_TESTS.personal);
    else if (/reports|dashboard|stats|forecast/i.test(file)) addMatching(DOMAIN_TESTS.reportes);
    else if (/whatsapp|twilio|comunicaciones/i.test(file)) addMatching(DOMAIN_TESTS.whatsapp);
    else if (/auth|login|session|password/i.test(file)) addMatching(DOMAIN_TESTS.auth);
  }

  // Si el código afectado no tiene una suite con nombre de dominio, ejecutar
  // todos los tests que cubren el mismo directorio principal como red de seguridad.
  if (selected.size === 0 && changed.some(file => !/^tests\//.test(file))) {
    const topLevels = new Set(
      changed
        .map(file => file.match(/^(app|components|hooks|contexts|lib|modules|workflows)\//)?.[1])
        .filter(Boolean)
    );
    for (const testFile of candidates) {
      const normalized = testFile.replaceAll('\\', '/');
      if ([...topLevels].some(top => normalized.startsWith(`tests/unit/${top}/`))) {
        selected.add(testFile);
      }
    }
  }

  return [...selected].sort();
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const base = process.env.BASE_SHA;
  const head = process.env.HEAD_SHA;
  let files;
  try {
    files = execFileSync('git', ['diff', '--name-only', base, head], { encoding: 'utf8' })
      .split(/\r?\n/)
      .filter(Boolean);
  } catch {
    console.error('No se pudo obtener el diff; se cancela para no omitir pruebas.');
    process.exit(1);
  }

  const selected = selectUnitTests(files);
  if (!selected.length) {
    console.log('Los cambios no tienen pruebas unitarias asociadas.');
    process.exit(0);
  }

  console.log(`Ejecutando ${selected.length} archivos de prueba relacionados:`);
  for (const file of selected) console.log(`- ${path.relative(ROOT, file).replaceAll('\\', '/')}`);
  const vitest = process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm';
  const { spawnSync } = await import('node:child_process');
  const result = spawnSync(vitest, ['exec', 'vitest', 'run', ...selected], {
    stdio: 'inherit',
    env: process.env
  });
  process.exit(result.status ?? 1);
}
