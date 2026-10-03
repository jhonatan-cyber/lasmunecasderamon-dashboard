#!/usr/bin/env node
/**
 * Análisis de arquitectura — Fase 0 del plan de monolito modular.
 *
 * Recorre el código y produce el diagnóstico verificable que el plan exige antes
 * de mover un solo archivo: mapa de imports por capa, SQL fuera de repositorios,
 * propiedad de tablas y escrituras cruzadas, transacciones, procesos periódicos,
 * contratos HTTP con sus permisos y ciclos entre módulos.
 *
 * No modifica nada. Sólo lee y escribe en docs/arquitectura/.
 *
 *   node scripts/arquitectura/analisis.mjs            # informe legible
 *   node scripts/arquitectura/analisis.mjs --json     # sólo JSON
 *   node scripts/arquitectura/analisis.mjs --corto    # resumen para consola
 */
import { readdirSync, readFileSync, writeFileSync, mkdirSync, statSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { join, dirname, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const ARGS = process.argv.slice(2);
const SOLO_JSON = ARGS.includes('--json');
const CORTO = ARGS.includes('--corto');

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

/* ───────────────────────────── Recorrido ───────────────────────────── */

/**
 * El conjunto de archivos del proyecto lo decide git, no el sistema de
 * archivos. `_tmp_real/` (127 archivos, ignorado) salía en el conteo y
 * inflaba los números del diagnóstico con scripts de depuración que no forman
 * parte de la aplicación. Se listan los rastreados más los no rastreados no
 * ignorados, de modo que un módulo nuevo sin commitear también se analiza.
 */
function archivosDelProyecto() {
  try {
    const salida = execFileSync(
      'git',
      ['ls-files', '--cached', '--others', '--exclude-standard', '-z'],
      { cwd: RAIZ, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 }
    );
    return salida
      .split('\0')
      .filter(Boolean)
      .filter(r => EXTS.some(x => r.endsWith(x)))
      .map(r => join(RAIZ, r));
  } catch {
    return recorrer(RAIZ);
  }
}

function recorrer(dir, acc = []) {
  let entradas;
  try {
    entradas = readdirSync(dir, { withFileTypes: true });
  } catch {
    return acc;
  }
  for (const e of entradas) {
    if (e.name.startsWith('.') && e.name !== '.agents') continue;
    const completo = join(dir, e.name);
    if (e.isDirectory()) {
      if (IGNORAR_DIRS.has(e.name)) continue;
      recorrer(completo, acc);
    } else if (EXTS.some(x => e.name.endsWith(x))) {
      acc.push(completo);
    }
  }
  return acc;
}

const archivos = archivosDelProyecto();

/** Capa técnica de un archivo, según su ruta relativa a la raíz. */
function capaDe(rel) {
  if (rel.startsWith('app/api/')) return 'app/api';
  if (rel.startsWith('app/')) return 'app/ui';
  if (rel.startsWith('components/')) return 'components';
  if (rel.startsWith('hooks/')) return 'hooks';
  if (rel.startsWith('lib/repositories/')) return 'lib/repositories';
  if (rel.startsWith('lib/services/')) return 'lib/services';
  if (rel.startsWith('lib/business/')) return 'lib/business';
  if (rel.startsWith('lib/api/')) return 'lib/api';
  if (rel.startsWith('lib/biometric/')) return 'lib/biometric';
  if (rel.startsWith('lib/database/')) return 'lib/database';
  if (rel.startsWith('lib/auth/') || rel.startsWith('lib/middleware/')) return 'lib/identidad';
  if (rel.startsWith('lib/integrations/')) return 'lib/integrations';
  if (rel.startsWith('lib/')) return 'lib/otros';
  if (rel.startsWith('scripts/')) return 'scripts';
  if (rel.startsWith('tests/')) return 'tests';
  return 'raiz';
}

/**
 * Módulo de dominio propietario. No es la estructura de carpetas (que sigue
 * siendo por capa técnica): es la tabla de la §4 del plan, para poder detectar
 * escrituras cruzadas entre dominios y no entre carpetas.
 */
const MODULO_POR_RUTA = [
  [/^lib\/repositories\/inventory\//, 'inventario'],
  [/^lib\/repositories\/(sale|saleQueries)/i, 'ventas'],
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
  [/^lib\/services\/(Purchase)/i, 'inventario'],
  [/^lib\/services\/(Product|Category|Transfer)/i, 'inventario'],
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
  [/^app\/api\/(notifications|audit-logs|error-logs)/, 'comunicaciones'],
  [/^app\/api\/(calendar|events)/, 'agenda'],
  [/^app\/api\/(settings|monitoring|swagger|api-docs|reports|test-auth|clients)/, 'infraestructura']
];

function moduloDe(rel) {
  for (const [re, mod] of MODULO_POR_RUTA) if (re.test(rel)) return mod;
  return null;
}

/* ───────────────────────────── Imports ───────────────────────────── */

const RE_IMPORT = /import\s+(?:type\s+)?(?:[\s\S]*?)\s*from\s*['"]([^'"]+)['"]/g;
const RE_EXPORT_FROM = /export\s+(?:type\s+)?(?:\*|\{[\s\S]*?\})\s*from\s*['"]([^'"]+)['"]/g;
const RE_DYN = /import\(\s*['"]([^'"]+)['"]\s*\)/g;

/** Resuelve un especificador de import a una ruta relativa a la raíz, o null si es paquete externo. */
function resolverDestino(spec, desdeRel) {
  let destino = null;
  if (spec.startsWith('@/')) {
    destino = spec.slice(2);
  } else if (spec.startsWith('.')) {
    destino = relative(RAIZ, resolve(dirname(join(RAIZ, desdeRel)), spec));
  } else {
    return null; // paquete externo
  }
  destino = destino.split('?')[0];
  if (EXTS.some(ext => destino.endsWith(ext))) return destino;
  // ¿es un directorio con index?
  try {
    if (statSync(join(RAIZ, destino)).isDirectory()) return join(destino, 'index');
  } catch {}
  return destino;
}

const grafo = new Map(); // rel -> { capa, modulo, imports:Set, dinamicos:Set }
const FUENTES = new Set(archivos.map(a => relative(RAIZ, a).split('\\').join('/')));

for (const abs of archivos) {
  const rel = relative(RAIZ, abs).split('\\').join('/');
  if (rel.includes('node_modules')) continue;
  let txt;
  try {
    txt = readFileSync(abs, 'utf8');
  } catch {
    continue;
  }
  const imports = new Set();
  const dinamicos = new Set();
  const considerar = (spec, esDinamico) => {
    const d = resolverDestino(spec, rel);
    if (!d) return;
    // Resolver a archivo real
    let final = d;
    if (!FUENTES.has(d)) {
      if (FUENTES.has(`${d}.ts`) || FUENTES.has(`${d}.tsx`)) final = `${d}.ts`;
      else if (FUENTES.has(`${d}/index.ts`) || FUENTES.has(`${d}/index.tsx`))
        final = `${d}/index.ts`;
    }
    (esDinamico ? dinamicos : imports).add(final);
  };
  for (const m of txt.matchAll(RE_IMPORT)) considerar(m[1], false);
  for (const m of txt.matchAll(RE_EXPORT_FROM)) considerar(m[1], false);
  for (const m of txt.matchAll(RE_DYN)) considerar(m[1], true);

  grafo.set(rel, {
    capa: capaDe(rel),
    modulo: moduloDe(rel),
    imports,
    dinamicos,
    txt
  });
}

/* ───────────────── SQL: acceso al driver y tablas ───────────────── */

const SIMBOLOS_DB = /\b(query|rawQuery|withTransaction|getPool|prepareQuery)\s*\(/;
const MODULO_DRIVER = 'lib/database/db';
const ES_REPO = rel => capaDe(rel) === 'lib/repositories';
const ES_TEST = rel => rel.startsWith('tests/');

/**
 * Un archivo "usa el driver" si importa el módulo de base de datos, no si
 * happens a llamar a una función suelta:aslímite arquitectónico es el import,
 * y buscar sólo llamadas perdía 21 de las 36 rutas que lo traen (las que
 * importan los símbolos y los reexportan o los usan vía alias). Se accepta
 * además el caso del import dinámico, que `getUserPermissionsFromDB` usa.
 */
function usaDriverDe(nodo) {
  for (const destino of [...nodo.imports, ...nodo.dinamicos]) {
    const d = destino.replace(/\.(ts|tsx|mjs|js)$/, '');
    if (d === MODULO_DRIVER || d === `${MODULO_DRIVER}/index`) return true;
  }
  return SIMBOLOS_DB.test(nodo.txt);
}

const sqlFueraDeRepositorio = [];
const escritoresTabla = new Map(); // tabla -> Set(repositorio)
const transactores = [];

const RE_INSERT = /\bINSERT\s+INTO\s+["'`]?(\w+)/gi;
const RE_UPDATE = /\bUPDATE\s+["'`]?(\w+)\s+SET\b/gi;
const RE_DELETE = /\bDELETE\s+FROM\s+["'`]?(\w+)/gi;
const RE_FROM = /\bFROM\s+["'`]?(\w+)/gi;
const RE_JOIN = /\bJOIN\s+["'`]?(\w+)/gi;

for (const [rel, n] of grafo) {
  if (ES_TEST(rel)) continue;
  const usaDriver = usaDriverDe(n);
  if (usaDriver) {
    const tablas = new Set();
    for (const re of [RE_INSERT, RE_UPDATE, RE_DELETE]) {
      re.lastIndex = 0;
      for (const m of n.txt.matchAll(re)) tablas.add(m[1].toLowerCase());
    }
    if (!ES_REPO(rel)) {
      sqlFueraDeRepositorio.push({
        archivo: rel,
        capa: n.capa,
        modulo: n.modulo,
        escribe: [...tablas].sort()
      });
    } else {
      for (const t of tablas) {
        if (!escritoresTabla.has(t)) escritoresTabla.set(t, new Set());
        escritoresTabla.get(t).add(rel);
      }
    }
    if (/\bwithTransaction\s*\(/.test(n.txt)) {
      transactores.push({ archivo: rel, capa: n.capa, modulo: n.modulo });
    }
  }
}

const escriturasCruzadas = [];
for (const [tabla, COLUMNAS] of [...escritoresTabla].sort()) {
  const reps = [...COLUMNAS].sort();
  if (reps.length < 2) continue;
  const modulos = new Set(reps.map(r => grafo.get(r)?.modulo).filter(Boolean));
  escriturasCruzadas.push({ tabla, escritores: reps, modulos: [...modulos].sort() });
}

/* ───────────── Procesos periódicos, listeners, cachés ───────────── */

const procesos = [];
const listeners = [];
const caches = [];

for (const [rel, n] of grafo) {
  if (ES_TEST(rel)) continue;
  const lineas = n.txt.split('\n');
  lineas.forEach((linea, i) => {
    const esComentario = /^\s*(\/\/|\*|\/\*)/.test(linea);
    if (esComentario) return;
    if (/\bsetInterval\s*\(/.test(linea))
      procesos.push({
        archivo: rel,
        linea: i + 1,
        tipo: 'setInterval',
        texto: linea.trim().slice(0, 110)
      });
    if (/\bprocess\.on\s*\(/.test(linea))
      listeners.push({ archivo: rel, linea: i + 1, texto: linea.trim().slice(0, 110) });
    if (
      /\bnew (Redis|RedisClient|ioredis)\b/.test(linea) ||
      (/\bredis\b/i.test(linea) && /new /i.test(linea))
    )
      caches.push({ archivo: rel, linea: i + 1, texto: linea.trim().slice(0, 110) });
  });
}

// Cachés propias: mapas en memoria y globalThis
for (const [rel, n] of grafo) {
  if (ES_TEST(rel)) continue;
  if (/new Map<[^>]*>\(\)/.test(n.txt) && /cache|Cache|cachear/i.test(n.txt)) {
    caches.push({ archivo: rel, linea: 0, texto: 'caché en memoria (new Map + cache)' });
  }
  if (/globalThis/.test(n.txt) && /cache|Cache/.test(n.txt)) {
    caches.push({ archivo: rel, linea: 0, texto: 'caché compartida en globalThis' });
  }
}

/* ───────────── Contratos HTTP y permisos ───────────── */

const RE_ROUTE = /app\/api\/(.*?)\/route\.ts$/;
const RE_WITHROUTE = /withRoute\s*\(\s*\{([\s\S]{0,400}?)\}/g;
const RE_ACCESO = /access:\s*'([^']+)'/;
const RE_MODULO = /module:\s*'([^']+)'/;
const RE_ACCION = /action:\s*'([^']+)'/;
const RE_AUDIT = /audit:\s*(true|false)/;

const rutas = [];
for (const [rel, n] of grafo) {
  const m = rel.match(RE_ROUTE);
  if (!m) continue;
  const ruta = '/api/' + m[1].replace(/\[\w+\]/g, ':id');
  const usaWithRoute = /withRoute|withPublicRoute|withAuthRoute/.test(n.txt);
  const publico = /withPublicRoute/.test(n.txt);
  let modulo = null;
  let accion = null;
  let acceso = null;
  let audit = false;
  for (const mm of n.txt.matchAll(RE_WITHROUTE)) {
    const cfg = mm[1];
    modulo = (cfg.match(RE_MODULO) || [, null])[1];
    accion = (cfg.match(RE_ACCION) || [, null])[1];
    acceso = (cfg.match(RE_ACCESO) || [, null])[1];
    if ((cfg.match(RE_AUDIT) || [, null])[1] === 'true') audit = true;
    if (modulo) break;
  }
  const nivel = !usaWithRoute
    ? 'SIN_WRAPPER'
    : publico
      ? 'publico'
      : acceso === 'administrator'
        ? 'administrator'
        : modulo
          ? `${modulo}.${accion}`
          : acceso === 'authenticated'
            ? 'authenticated'
            : 'publico';
  rutas.push({
    ruta,
    archivo: rel,
    metodos: [
      ...n.txt.matchAll(/export\s+(?:async\s+)?function\s+(GET|POST|PUT|PATCH|DELETE)\b/g)
    ].map(x => x[1]),
    nivel,
    audit,
    moduloDominio: n.modulo,
    usaDriver: usaDriverDe(n)
  });
}

/* ───────────── Ciclos entre dominios ───────────── */

const aristas = new Map(); // módulo -> Set(módulos de los que depende)
for (const [rel, n] of grafo) {
  if (!n.modulo || ES_TEST(rel)) continue;
  for (const destino of [...n.imports, ...n.dinamicos]) {
    const nd = grafo.get(destino);
    if (!nd || !nd.modulo) continue;
    if (nd.modulo === n.modulo) continue;
    if (!aristas.has(n.modulo)) aristas.set(n.modulo, new Set());
    aristas.get(n.modulo).add(nd.modulo);
  }
}

const ciclos = [];
{
  const estado = new Map();
  const pila = [];
  const dfs = u => {
    if (estado.get(u) === 1) {
      const i = pila.indexOf(u);
      ciclos.push([...pila.slice(i), u]);
      return;
    }
    if (estado.get(u) === 2) return;
    estado.set(u, 1);
    pila.push(u);
    for (const v of aristas.get(u) || []) dfs(v);
    pila.pop();
    estado.set(u, 2);
  };
  for (const u of [...aristas.keys()].sort()) dfs(u);
}

/* ───────────── Matriz de dependencias por capa ───────────── */

const ORDEN = [
  'app/api',
  'app/ui',
  'components',
  'hooks',
  'lib/api',
  'lib/business',
  'lib/services',
  'lib/repositories',
  'lib/database',
  'lib/identidad',
  'lib/biometric',
  'lib/integrations',
  'lib/otros',
  'scripts',
  'raiz',
  'tests'
];

const matriz = {};
for (const [rel, n] of grafo) {
  if (!aristas.has(rel)) continue;
  if (ES_TEST(rel)) continue;
  if (!matriz[n.capa]) matriz[n.capa] = {};
  for (const d of n.imports) {
    const nd = grafo.get(d);
    if (!nd || nd.capa === n.capa) continue;
    matriz[n.capa][nd.capa] = (matriz[n.capa][nd.capa] || 0) + 1;
  }
}

/* ───────────── Salida ───────────── */

/** Commit sobre el que se generó el informe, para que el artefacto se describa solo. */
function commitActual() {
  if (process.env.FASE0_COMMIT) return process.env.FASE0_COMMIT;
  try {
    return execFileSync('git', ['rev-parse', 'HEAD'], {
      cwd: RAIZ,
      encoding: 'utf8'
    }).trim();
  } catch {
    return null;
  }
}

const resumen = {
  commit: commitActual(),
  generado: new Date().toISOString(),
  archivos: grafo.size,
  rutas: rutas.length,
  sqlFueraDeRepositorio: sqlFueraDeRepositorio.length,
  tablasConEscritoresMultiples: escriturasCruzadas.length,
  ciclos: ciclos.length,
  procesosPeriodicos: procesos.length,
  caches: caches.length,
  rutasApiConSqlDirecto: rutas.filter(r => r.usaDriver).length,
  rutasSinWrapper: rutas.filter(r => r.nivel === 'SIN_WRAPPER').length
};

const informe = {
  resumen,
  rutas,
  sqlFueraDeRepositorio: sqlFueraDeRepositorio.sort((a, b) => b.capa.localeCompare(a.capa)),
  escriturasCruzadas,
  transacciones: transactores,
  procesos,
  listeners,
  caches,
  ciclos,
  matriz,
  ordenCapas: ORDEN
};

mkdirSync(join(RAIZ, 'docs', 'arquitectura'), { recursive: true });
writeFileSync(
  join(RAIZ, 'docs', 'arquitectura', 'analisis.json'),
  JSON.stringify(informe, null, 2)
);

/* ───────────────────── Informe legible ───────────────────── */

function tabla(filas, cabeceras) {
  if (!filas.length) return '_(sin resultados)_\n';
  const esc = s => String(s ?? '').replace(/\|/g, '\\|');
  let out = `| ${cabeceras.join(' | ')} |\n| ${cabeceras.map(() => '---').join(' | ')} |\n`;
  for (const f of filas) out += `| ${f.map(esc).join(' | ')} |\n`;
  return out;
}

function md() {
  let s = '';
  s += `# Diagnóstico de arquitectura — Fase 0\n\n`;
  s += `Generado por \`scripts/arquitectura/analisis.mjs\`. No modificar a mano.\n\n`;
  s += `| Métrica | Valor |\n|---|---|\n`;
  s += `| Archivos analizados | ${resumen.archivos} |\n`;
  s += `| Rutas HTTP | ${resumen.rutas} |\n`;
  s += `| **Rutas con SQL directo** | **${resumen.rutasApiConSqlDirecto}** |\n`;
  s += `| **Archivos con SQL fuera de repositorios** | **${resumen.sqlFueraDeRepositorio}** |\n`;
  s += `| Tablas con más de un escritor | ${resumen.tablasConEscritoresMultiples} |\n`;
  s += `| Ciclos entre dominios | ${resumen.ciclos} |\n`;
  s += `| Procesos periódicos | ${resumen.procesosPeriodicos} |\n`;
  s += `| Puntos de caché | ${resumen.caches} |\n`;
  s += `| Rutas sin \`withRoute\` | ${resumen.rutasSinWrapper} |\n\n`;

  s += `## 1. SQL fuera de repositorios\n\n`;
  s += `Objetivo del plan (§3.3 y §5): el SQL queda en infraestructura, los controladores HTTP traducen. Esto es lo que hay que reducir a cero.\n\n`;
  const porCapa = {};
  for (const x of sqlFueraDeRepositorio) porCapa[x.capa] = (porCapa[x.capa] || 0) + 1;
  s += tabla(
    Object.entries(porCapa).map(([c, n]) => [c, n]),
    ['Capa', 'Archivos con SQL']
  );
  s += `\n<details><summary>Detalle por archivo</summary>\n\n`;
  s += tabla(
    sqlFueraDeRepositorio.map(x => [x.archivo, x.capa, x.escribe.join(', ') || '—']),
    ['Archivo', 'Capa', 'Tablas que escribe']
  );
  s += `\n</details>\n\n`;

  s += `## 2. Propiedad de tablas\n\n`;
  s += `Tablas que escriben más de un repositorio. Son las escrituras cruzadas que el principio 1 del plan quiere eliminar: cada tabla debería tener un único módulo propietario.\n\n`;
  s += tabla(
    escriturasCruzadas.map(e => [e.tabla, e.escritores.length, e.escritores.join('<br>')]),
    ['Tabla', 'Escritores', 'Repositorios']
  );

  s += `\n## 3. Ciclos entre dominios\n\n`;
  if (!ciclos.length) s += `_No se detectaron ciclos en el grafo de dominios._\n`;
  else
    s += tabla(
      ciclos.map(c => [c.join(' → ')]),
      ['Ciclo']
    );

  s += `\n## 4. Transacciones\n\n`;
  s += tabla(
    transactores.map(t => [t.archivo, t.capa]),
    ['Archivo con withTransaction', 'Capa']
  );

  s += `\n## 5. Procesos periódicos y ciclo de vida\n\n`;
  s += `Deben pasar a tener un ciclo de vida explícito al migrar Asistencia (fase 3).\n\n`;
  s += tabla(
    procesos.map(p => [p.archivo, p.linea, p.texto]),
    ['Archivo', 'Línea', 'Código']
  );

  s += `\n## 6. Cachés\n\n`;
  s += tabla(
    caches.map(c => [c.archivo, c.linea || '—', c.texto]),
    ['Archivo', 'Línea', 'Tipo']
  );

  s += `\n## 7. Contratos HTTP\n\n`;
  s += `Cada ruta con su nivel de acceso. Este inventario es el contrato que la migración no puede romper.\n\n`;
  s += tabla(
    rutas.map(r => [
      r.ruta,
      r.metodos.join(' '),
      r.nivel,
      r.usaDriver ? '⚠️ SQL' : '',
      r.audit ? 'audit' : ''
    ]),
    ['Ruta', 'Métodos', 'Nivel', 'Driver', 'Audit']
  );

  s += `\n## 8. Matriz de dependencias por capa\n\n`;
  s += `Importaciones entre capas técnicas. Las celdas vacías son las que el plan quiere poder restringir.\n\n`;
  const filas = [];
  for (const origen of ORDEN) {
    if (!matriz[origen]) continue;
    const fila = [origen];
    for (const destino of ORDEN) fila.push(matriz[origen][destino] || '');
    filas.push(fila);
  }
  s += tabla(filas, ['origen ↓ / destino →', ...ORDEN]);
  return s;
}

if (!SOLO_JSON) {
  const salida = md();
  writeFileSync(join(RAIZ, 'docs', 'arquitectura', 'FASE0_DIAGNOSTICO.md'), salida);
}

if (CORTO) {
  console.log(JSON.stringify(resumen, null, 2));
} else {
  console.log(md());
  if (!SOLO_JSON) console.log('\nEscrito: docs/arquitectura/FASE0_DIAGNOSTICO.md y analisis.json');
}
