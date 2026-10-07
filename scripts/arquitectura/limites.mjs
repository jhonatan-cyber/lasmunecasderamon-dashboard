#!/usr/bin/env node
/**
 * Control de dependencias entre módulos — Fase 1 del plan de monolito modular.
 *
 * `analisis.mjs` mide; esto **falla**. Es la puerta que el §7 del plan exige:
 * «una dependencia prohibida introducida deliberadamente hace fallar el control».
 *
 * Lo que se comprueba, contra el grafo de imports ya resuelto por `analisis.mjs`
 * (alias `@/`, rutas relativas e `import()` dinámico, para que ninguna forma de
 * importar esquive la regla):
 *
 *   1. La UI no toca infraestructura: `components/` y `hooks/` no pueden
 *      importar el driver de PostgreSQL ni los repositorios.
 *   2. La lógica de negocio no depende del framework: `lib/business/` no
 *      importa `next/server`.
 *   3. Los módulos no importan workflows.
 *   4. El grafo entre dominios no tiene ciclos.
 *
 * Las violaciones que ya existen son herencia. No se las ignora en silencio:
 * viven en `docs/arquitectura/excepciones.json` con motivo, responsable y
 * condición de eliminación, y el control falla si esa lista **crece**. Si una
 * excepción desaparece, también falla: es una deuda que se pagó y nadie lo anotó.
 *
 *   node scripts/arquitectura/limites.mjs            # valida
 *   node scripts/arquitectura/limites.mjs --listar   # solo enumera
 */
import { readFileSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';
import { escriturasDe } from './propiedad.mjs';

const RAIZ = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const LISTAR = process.argv.includes('--listar');

const EXCEPCIONES_PATH = join(RAIZ, 'docs', 'arquitectura', 'excepciones.json');

/* ───────────── Grafo de imports (misma resolución que el diagnóstico) ───────────── */

const EXTS = ['.ts', '.tsx', '.mjs', '.js'];
const IGNORAR_DIRS = new Set([
  'node_modules',
  '.next',
  '.git',
  'coverage',
  'playwright-report',
  'test-results',
  'bones'
]);

const RE_IMPORT = /import\s+(?:type\s+)?(?:[\s\S]*?)\s*from\s*['"]([^'"]+)['"]/g;
const RE_EXPORT_FROM = /export\s+(?:type\s+)?(?:\*|\{[\s\S]*?\})\s*from\s*['"]([^'"]+)['"]/g;
const RE_DYN = /import\(\s*['"]([^'"]+)['"]\s*\)/g;

function archivosDelProyecto() {
  return execFileSync('git', ['ls-files', '--cached', '--others', '--exclude-standard', '-z'], {
    cwd: RAIZ,
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024
  })
    .split('\0')
    .filter(Boolean)
    .filter(r => !r.startsWith('.') && !r.split('/').some(parte => IGNORAR_DIRS.has(parte)))
    .filter(r => EXTS.some(x => r.endsWith(x)))
    .map(r => join(RAIZ, r));
}

const MODULO_POR_RUTA = [
  [/^lib\/repositories\/(CashRegister|Withdrawal)/, 'caja'],
  [/^lib\/repositories\/Client/, 'clientes'],
  [/^lib\/repositories\/(Commission|Tip|Payroll)/, 'personal'],
  [/^lib\/repositories\/(Permission|Role|User)/, 'identidad'],
  [/^lib\/repositories\/(Order|Room|Timer)/, 'operacion'],
  [/^lib\/services\/RoomManager/, 'operacion'],
  [/^lib\/repositories\/Category/, 'inventario'],

  // Los módulos migrados (Fase 2 en adelante) viven en modules/. Se agregan
  // entradas explícitas a medida que se crean.
  [/^modules\/inventario(\/|$)/, 'inventario'],
  [/^modules\/personal\//, 'personal'],
  // El directorio (`@/modules/asistencia`) y el index son API pública: ambos
  // cuentan como arista del dominio, o el grafo no vería los imports reales.
  [/^modules\/asistencia(\/|$)/, 'asistencia'],
  [/^modules\/identidad(\/|$)/, 'identidad'],
  [/^lib\/repositories\/inventory\//, 'inventario'],
  [/^lib\/repositories\/(sale)/i, 'ventas'],
  [/^lib\/repositories\/(attendance)/i, 'asistencia'],
  [/^lib\/repositories\/(gratificacion)/i, 'personal'],
  [/^lib\/repositories\/(anticipo)/i, 'personal'],
  [/^lib\/repositories\/(auth)/i, 'identidad'],
  [/^lib\/repositories\/(cuenta)/i, 'operacion'],
  [/^lib\/repositories\/(service|Service)/, 'operacion'],
  [/^lib\/repositories\/report\//, 'reportes'],
  [/^lib\/repositories\/stats\//, 'reportes'],
  [/^lib\/repositories\/(event|Calendar)/i, 'agenda'],
  [/^lib\/repositories\/(Notification)/i, 'comunicaciones'],
  [/^lib\/repositories\/(Audit|ErrorLog)/i, 'auditoria'],
  [/^lib\/biometric\//, 'asistencia'],
  [/^lib\/services\/(Attendance|Kiosk)/i, 'asistencia'],
  [/^lib\/services\/(Sale|Ventas)/i, 'ventas'],
  [/^lib\/services\/(Purchase|Product|Category|Transfer)/i, 'inventario'],
  [/^lib\/services\/(Account|Cuenta)/i, 'operacion'],
  [/^lib\/services\/(CashRegister|Withdrawal)/i, 'caja'],
  [
    /^lib\/services\/(Anticipo|Commission|Overtime|Tip|Gratificacion|Payroll|Personal)/i,
    'personal'
  ],
  [/^lib\/services\/(Client)/i, 'clientes'],
  [/^lib\/services\/(Auth|Permission|Role|User)/i, 'identidad'],
  [/^lib\/services\/(Order|Service)/i, 'operacion'],
  [/^lib\/services\/(Audit|ErrorLog|Notification|Whatsapp|Push)/i, 'comunicaciones'],
  [/^lib\/services\/(Report|Stats|Dashboard)/i, 'reportes'],
  [/^lib\/(auth|middleware)\//, 'identidad'],
  [/^lib\/(integrations)\//, 'comunicaciones'],
  [/^app\/api\/(auth|roles|users|permissions|public\/users)/, 'identidad'],
  [/^app\/api\/(attendance|kiosk|biometric)/, 'asistencia'],
  [/^app\/api\/(bar|products|transfers|purchases|categories|rooms)/, 'inventario'],
  [/^app\/api\/(sales|ventas)/, 'ventas'],
  [/^app\/api\/(cashregister|caja)/, 'caja'],
  [/^app\/api\/(orders|rooms|servicios|cuentas|returns)/, 'operacion'],
  [
    /^app\/api\/(anticipos|commissions|overtime|tips|gratificaciones|payroll|anfitrionas)/,
    'personal'
  ],
  [/^app\/api\/(clients)/, 'clientes'],
  // El canal SSE del kiosko verifica kiosk_devices y difunde eventos de
  // asistencia: es adaptador de Asistencia, no de Comunicaciones (Fase 3).
  [/^app\/api\/notifications\/kiosk/, 'asistencia'],
  [/^app\/api\/(notifications|audit-logs|error-logs)/, 'comunicaciones'],
  [/^app\/api\/(calendar|events)/, 'agenda'],
  [/^app\/api\//, 'infraestructura']
];

function moduloDe(rel) {
  // Los adaptadores HTTP coordinan casos de uso; su URL no es un dominio.
  if (rel.startsWith('app/')) return null;
  const modulo = /^modules\/([^/]+)(?:\/|$)/.exec(rel);
  if (modulo) return modulo[1];
  for (const [re, mod] of MODULO_POR_RUTA) if (re.test(rel)) return mod;
  return null;
}

function resolverDestino(spec, desdeRel) {
  if (spec.startsWith('@/')) return spec.slice(2);
  if (spec.startsWith('.')) {
    const ruta = resolve(dirname(join(RAIZ, desdeRel)), spec);
    return ruta
      .slice(RAIZ.length + 1)
      .split('\\')
      .join('/');
  }
  return null; // paquete externo
}

const aristas = [];
const escrituras = [];
const archivosServidor = new Set();
for (const abs of archivosDelProyecto()) {
  const rel = abs
    .slice(RAIZ.length + 1)
    .split('\\')
    .join('/');
  if (rel.startsWith('tests/') || rel.startsWith('scripts/')) continue;
  let txt;
  try {
    txt = readFileSync(abs, 'utf8');
  } catch {
    continue;
  }
  const specs = [];
  const fuente = ts.createSourceFile(rel, txt, ts.ScriptTarget.Latest, true);
  for (const tabla of escriturasDe(fuente)) escrituras.push({ desde: rel, tabla });
  function visitar(nodo) {
    if (
      (ts.isImportDeclaration(nodo) || ts.isExportDeclaration(nodo)) &&
      nodo.moduleSpecifier &&
      ts.isStringLiteral(nodo.moduleSpecifier)
    ) {
      const clause = ts.isImportDeclaration(nodo) ? nodo.importClause : nodo.exportClause;
      const tipo = Boolean(
        nodo.isTypeOnly ||
        clause?.isTypeOnly ||
        (clause?.elements?.length && clause.elements.every(e => e.isTypeOnly))
      );
      specs.push({ spec: nodo.moduleSpecifier.text, tipo, reexport: ts.isExportDeclaration(nodo) });
    } else if (
      ts.isCallExpression(nodo) &&
      nodo.arguments.length &&
      ts.isStringLiteral(nodo.arguments[0]) &&
      (nodo.expression.kind === ts.SyntaxKind.ImportKeyword ||
        (ts.isIdentifier(nodo.expression) && nodo.expression.text === 'require'))
    ) {
      specs.push({ spec: nodo.arguments[0].text, tipo: false, reexport: false });
    }
    ts.forEachChild(nodo, visitar);
  }
  visitar(fuente);
  if (specs.some(importacion => importacion.spec === 'server-only')) archivosServidor.add(rel);
  for (const { spec, tipo, reexport } of specs) {
    const destino = resolverDestino(spec, rel);
    if (!destino) continue;
    let final = destino;
    if (!existsSync(join(RAIZ, destino))) {
      if (existsSync(join(RAIZ, `${destino}.ts`))) final = `${destino}.ts`;
      else if (existsSync(join(RAIZ, destino, 'index.ts'))) final = `${destino}/index.ts`;
    }
    aristas.push({ desde: rel, hacia: final, spec, tipo, reexport });
  }
}

/* ───────────── Reglas ───────────── */

/** ¿Es este import el driver de PostgreSQL o un repositorio? */
const ES_DRIVER = h => /^lib\/database\/(db|postgres)/.test(h) || h.startsWith('lib/repositories/');

const REGLAS = [
  {
    id: 'api-sin-reexportar-persistencia',
    plan: '§5 — los repositorios son privados, también a través de reexportaciones',
    desc: 'una API pública o servicio no reexporta funciones de un repositorio',
    viola: d =>
      d.reexport &&
      !d.tipo &&
      /^modules\//.test(d.desde) &&
      /\/(index|servicio)\.ts$/.test(d.desde) &&
      /[Rr]epositorio/.test(d.hacia)
  },
  {
    id: 'workflow-sin-persistencia',
    plan: '§6 — el workflow coordina APIs públicas con una unidad de trabajo',
    desc: 'un workflow no importa drivers, repositorios ni servicios heredados',
    viola: d =>
      d.desde.startsWith('workflows/') &&
      (ES_DRIVER(d.hacia) || d.hacia.startsWith('lib/services/'))
  },
  {
    id: 'ui-no-infraestructura',
    plan: '§5 — la UI y los hooks consumen HTTP y contratos de cliente',
    desc: 'components/ y hooks/ no importan el driver ni los repositorios',
    viola: d =>
      /^(components|hooks|app)\//.test(d.desde) &&
      !d.desde.startsWith('app/api/') &&
      ES_DRIVER(d.hacia)
  },
  {
    id: 'negocio-sin-framework',
    plan: '§5 — el dominio no depende de Next.js, React ni del driver',
    desc: 'lib/business/ no importa next/server',
    viola: d => d.desde.startsWith('lib/business/') && /^next\/server/.test(d.spec)
  },
  {
    id: 'modulos-sin-workflows',
    plan: '§5 — los módulos no importan workflows',
    desc: 'sólo workflows y adaptadores HTTP pueden importar workflows',
    viola: d =>
      d.hacia.startsWith('workflows/') &&
      !d.desde.startsWith('workflows/') &&
      !(d.desde.startsWith('app/') && d.desde.endsWith('/route.ts'))
  },
  {
    id: 'modulo-solo-api-publica',
    plan: '§5 — entre módulos sólo se permiten imports desde index.ts o contracts.ts',
    desc: 'nada fuera de modules/<mod>/ importa el interior de un módulo',
    viola: d => {
      if (!d.hacia.startsWith('modules/')) return false;
      const modulo = d.hacia.split('/')[1];
      if (d.desde.startsWith(`modules/${modulo}/`)) return false;
      // La API pública es `modules/<mod>` (el directorio, que resuelve a su
      // index.ts) o `modules/<mod>/index.ts`; `contracts.ts` para los tipos
      // aptos para cliente. Todo lo demás es interior.
      return !/^(modules\/[^/]+|modules\/[^/]+\/(index|contracts)\.ts)$/.test(d.hacia);
    }
  },
  {
    id: 'ui-consume-modulos-por-http',
    plan: '§5 — la UI y los hooks consumen HTTP y contratos seguros para cliente',
    desc: 'components/ y hooks/ no importan módulos; la UI de app/ sólo contracts.ts; un route.ts fuera de app/api es adaptador de servidor',
    viola: d => {
      if (!d.hacia.startsWith('modules/')) return false;
      if (/^(components|hooks)\//.test(d.desde)) return !d.hacia.endsWith('/contracts.ts');
      if (/^app\//.test(d.desde) && !d.desde.startsWith('app/api/')) {
        // Un route handler es adaptador de servidor esté o no en /api (iclock
        // y dahua quedan fuera a propósito: hablan HTTP plano, sin middleware).
        if (d.desde.endsWith('/route.ts')) return false;
        return !d.hacia.endsWith('/contracts.ts');
      }
      return false;
    }
  },
  {
    id: 'infra-transaccional-autorizada',
    plan: '§6 — sólo la infraestructura autorizada resuelve el contexto al cliente PostgreSQL',
    desc: 'lib/transaccion/infraestructura sólo lo importa la infraestructura de los módulos',
    viola: d =>
      d.hacia === 'lib/transaccion/infraestructura.ts' &&
      !/^modules\/.*\/(?:repositorio|[^/]*Repositorio|consultas|registro|infraestructura)\.ts$/.test(
        d.desde
      ) &&
      !d.desde.startsWith('lib/transaccion/')
  },
  {
    id: 'puente-transaccional-heredado',
    plan: 'Transición de Fase 4 — el puente al contexto opaco se retira al migrar la transacción de ventas',
    desc: 'ningún consumidor de producción usa el puente de transacción heredada',
    viola: d => d.hacia === 'lib/transaccion/compatibilidad.ts' || d.hacia.startsWith('tests/')
  }
];

/* Ciclos entre dominios */
function ciclos() {
  const g = new Map();
  for (const a of aristas) {
    if (a.tipo) continue;
    const m1 = moduloDe(a.desde);
    const m2 = moduloDe(a.hacia);
    if (!m1 || !m2 || m1 === m2) continue;
    if (!g.has(m1)) g.set(m1, new Set());
    g.get(m1).add(m2);
  }
  // Una arista por hallazgo: no depende del orden de recorrido del DFS.
  // Detecta todas las aristas ciclicas, incluso dentro de un ciclo ya exceptuado.
  const camino = (desde, hasta, visitados = new Set()) => {
    if (desde === hasta) return [desde];
    if (visitados.has(desde)) return null;
    visitados.add(desde);
    for (const vecino of [...(g.get(desde) || [])].sort()) {
      const resto = camino(vecino, hasta, visitados);
      if (resto) return [desde, ...resto];
    }
    return null;
  };
  const salida = [];
  for (const desde of [...g.keys()].sort()) {
    for (const hacia of [...g.get(desde)].sort()) {
      const vuelta = camino(hacia, desde);
      if (vuelta) salida.push({ desde, hacia, ciclo: [desde, ...vuelta] });
    }
  }
  return salida;
}

/* ───────────── Hallazgos ───────────── */

if (process.argv.includes('--grafo')) {
  console.log(
    JSON.stringify(
      aristas
        .filter(a => {
          const desde = moduloDe(a.desde);
          const hacia = moduloDe(a.hacia);
          return desde && hacia && desde !== hacia;
        })
        .map(a => ({ ...a, origen: moduloDe(a.desde), destino: moduloDe(a.hacia) })),
      null,
      2
    )
  );
  process.exit(0);
}

const hallazgos = [];
const dependenciasEjecucion = new Map();
for (const arista of aristas)
  if (!arista.tipo) {
    if (!dependenciasEjecucion.has(arista.desde)) dependenciasEjecucion.set(arista.desde, []);
    dependenciasEjecucion.get(arista.desde).push(arista.hacia);
  }
for (const contrato of new Set(
  aristas
    .map(arista => arista.desde)
    .filter(archivo => /^modules\/[^/]+\/contracts\.ts$/.test(archivo))
)) {
  const pendientes = [contrato];
  const vistos = new Set();
  while (pendientes.length) {
    const archivo = pendientes.pop();
    if (vistos.has(archivo)) continue;
    vistos.add(archivo);
    if (archivosServidor.has(archivo) || ES_DRIVER(archivo)) {
      hallazgos.push({
        regla: 'contratos-sin-servidor',
        plan: '§5 — contratos seguros para cliente',
        desde: contrato,
        hacia: archivo,
        spec: ''
      });
      continue;
    }
    pendientes.push(...(dependenciasEjecucion.get(archivo) ?? []));
  }
}
const propietarios = JSON.parse(
  readFileSync(join(RAIZ, 'docs/arquitectura/propietarios-tablas.json'), 'utf8')
);
const propietarioPorTabla = new Map();
for (const [modulo, tablas] of Object.entries(propietarios)) {
  for (const tabla of tablas) {
    if (propietarioPorTabla.has(tabla)) throw new Error(`Tabla con dos propietarios: ${tabla}`);
    propietarioPorTabla.set(tabla, modulo);
  }
}
// Infraestructura técnica global: instrumentación y mantenimiento explícito de la base.
const ESCRITORES_TECNICOS = new Set([
  'lib/database/base-repository.ts',
  'lib/database/db.ts',
  'lib/database/query-log.ts',
  'lib/database/sync-operations.ts',
  'lib/database/maintenance.ts'
]);
for (const escritura of escrituras) {
  if (ESCRITORES_TECNICOS.has(escritura.desde)) continue;
  const propietario = propietarioPorTabla.get(escritura.tabla);
  // El servidor MCP mantiene su estado OAuth en SQLite, separado del PostgreSQL del dashboard.
  const modulo =
    /^modules\/([^/]+)\//.exec(escritura.desde)?.[1] ||
    (/^mcp\/src\/oauth\//.test(escritura.desde) ? 'mcp-oauth' : undefined);
  if (!propietario || modulo !== propietario)
    hallazgos.push({
      regla: 'tabla-unico-propietario',
      plan: '§5 — sólo el módulo propietario escribe su tabla',
      desde: escritura.desde,
      hacia: `${escritura.tabla} (${propietario ?? 'sin propietario'})`,
      spec: ''
    });
}
for (const regla of REGLAS) {
  for (const a of aristas) {
    if (regla.viola(a)) {
      hallazgos.push({
        regla: regla.id,
        plan: regla.plan,
        desde: a.desde,
        hacia: a.hacia,
        spec: a.spec
      });
    }
  }
}

for (const c of ciclos()) {
  hallazgos.push({
    regla: 'sin-ciclos',
    plan: '\u00a75 - las dependencias entre modulos forman un grafo sin ciclos',
    desde: `${c.desde} (dominio)`,
    hacia: `${c.hacia} (dominio)`,
    ciclo: c.ciclo,
    spec: ''
  });
}

/* ───────────── Excepciones heredadas ───────────── */

const clave = h => `${h.regla}|${h.desde}|${h.hacia}`;
let excepciones = {};
if (existsSync(EXCEPCIONES_PATH)) {
  try {
    excepciones = JSON.parse(readFileSync(EXCEPCIONES_PATH, 'utf8'));
  } catch (e) {
    console.error(`No se pudo leer ${EXCEPCIONES_PATH}: ${e.message}`);
    process.exit(2);
  }
}
const permitidas = new Set(Object.keys(excepciones));

const nuevas = hallazgos.filter(h => !permitidas.has(clave(h)));
const obsoletas = [...permitidas].filter(k => !hallazgos.some(h => clave(h) === k));

/* ───────────── Salida ───────────── */

if (LISTAR) {
  console.log(JSON.stringify({ hallazgos, excepciones }, null, 2));
  process.exit(0);
}

const porRegla = {};
for (const h of hallazgos) (porRegla[h.regla] ||= []).push(h);

console.log('Control de dependencias entre módulos\n');
for (const [regla, lista] of Object.entries(porRegla)) {
  console.log(`  ${regla}: ${lista.length}`);
}
console.log(`  Total de hallazgos: ${hallazgos.length}`);
console.log(`  Excepciones registradas: ${permitidas.size}\n`);

let fallo = 0;

if (nuevas.length) {
  fallo = 1;
  console.error('✗ Dependencias prohibidas nuevas:\n');
  for (const h of nuevas) {
    console.error(`  [${h.regla}] ${h.desde}`);
    console.error(`      importa ${h.spec || h.hacia}   (${h.plan})`);
  }
  console.error(
    '\n  Si la dependencia es correcta y heredada, regístrala en\n' +
      '  docs/arquitectura/excepciones.json con motivo, responsable y\n' +
      '  condición de eliminación. Para eso está `--listar`.'
  );
}

if (obsoletas.length) {
  fallo = 1;
  console.error('\n✗ Excepciones que ya no aplican (deuda pagada, no anotada):\n');
  for (const k of obsoletas) console.error(`  ${k}`);
  console.error('\n  Bórralas de docs/arquitectura/excepciones.json.');
}

if (!fallo) {
  console.log('✓ Sin dependencias prohibidas nuevas y sin excepciones obsoletas.');
}

process.exit(fallo);
