/**
 * El control de límites sólo sirve si falla. Estos tests comprueban la puerta
 * contra una dependencia prohibida introducida de verdad, en las tres formas en
 * que se puede esquivar un chequeo de imports: ruta relativa, alias e import
 * dinámico. El §7 del plan lo pide explícitamente.
 *
 * También fijan el otro sentido: si una excepción registrada deja de aplicar, la
 * puerta falla. Una deuda pagada y no anotada es deuda que vuelve.
 */ import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { execFileSync } from 'node:child_process';
import {
  mkdtempSync,
  writeFileSync,
  rmSync,
  cpSync,
  mkdirSync,
  existsSync,
  readFileSync,
  symlinkSync
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const RAIZ = resolve(__dirname, '..', '..', '..');
const SCRIPT_REL = join('scripts', 'arquitectura', 'limites.mjs');

/** Ejecuta la puerta en modo de validación y devuelve salida y código de salida. */
function correr(raiz: string): { codigo: number; salida: string } {
  try {
    const salida = execFileSync('node', [SCRIPT_REL], {
      cwd: raiz,
      encoding: 'utf8',
      maxBuffer: 32 * 1024 * 1024,
      stdio: ['ignore', 'pipe', 'pipe']
    });
    return { codigo: 0, salida };
  } catch (e: any) {
    return { codigo: e.status ?? 1, salida: `${e.stdout ?? ''}${e.stderr ?? ''}` };
  }
}

/** Enumera los hallazgos sin validar (para inspeccionar). */
function listar(raiz: string): any {
  const salida = execFileSync('node', [SCRIPT_REL, '--listar'], {
    cwd: raiz,
    encoding: 'utf8',
    maxBuffer: 32 * 1024 * 1024
  });
  return JSON.parse(salida);
}

/**
 * Repositorio mínimo para el fixture. El control calcula su raíz dos niveles
 * arriba de su propia ubicación, así que la copia va en `scripts/arquitectura/`
 * y en ningún otro sitio: una copia suelta en la raíz haría que escaneara otro
 * árbol y los hallazgos no dirían relación con nada.
 */
function repoDePrueba(): string {
  const dir = mkdtempSync(join(tmpdir(), 'lmr-limites-'));
  execFileSync('git', ['init', '-q'], { cwd: dir });

  mkdirSync(join(dir, 'components'), { recursive: true });
  mkdirSync(join(dir, 'lib', 'database'), { recursive: true });
  mkdirSync(join(dir, 'scripts', 'arquitectura'), { recursive: true });
  mkdirSync(join(dir, 'docs', 'arquitectura'), { recursive: true });

  writeFileSync(join(dir, 'lib', 'database', 'db.ts'), 'export function query() { return []; }\n');
  writeFileSync(join(dir, 'components', 'util.ts'), 'export const formatMoney = 1;\n');
  // Sano: la UI importa de la UI.
  writeFileSync(
    join(dir, 'components', 'Sano.tsx'),
    "import { formatMoney } from './util';\nexport const a = formatMoney;\n"
  );
  cpSync(join(RAIZ, SCRIPT_REL), join(dir, SCRIPT_REL));
  cpSync(
    join(RAIZ, 'scripts/arquitectura/propiedad.mjs'),
    join(dir, 'scripts/arquitectura/propiedad.mjs')
  );
  cpSync(
    join(RAIZ, 'docs/arquitectura/propietarios-tablas.json'),
    join(dir, 'docs/arquitectura/propietarios-tablas.json')
  );
  mkdirSync(join(dir, 'node_modules'), { recursive: true });
  symlinkSync(
    join(RAIZ, 'node_modules/typescript'),
    join(dir, 'node_modules/typescript'),
    'junction'
  );
  writeFileSync(join(dir, 'docs', 'arquitectura', 'excepciones.json'), '{}\n');
  return dir;
}

describe('control de límites entre módulos', () => {
  let raiz: string;

  beforeAll(() => {
    raiz = repoDePrueba();
  });

  afterAll(() => {
    if (raiz) rmSync(raiz, { recursive: true, force: true });
  });

  it('pasa cuando no hay dependencias prohibidas', () => {
    const datos = listar(raiz);
    expect(datos.hallazgos.filter((h: any) => h.regla === 'ui-no-infraestructura')).toHaveLength(0);
    expect(correr(raiz).codigo).toBe(0);
  });

  it('detecta un import de infraestructura desde la UI por alias', () => {
    writeFileSync(
      join(raiz, 'components', 'Malo.tsx'),
      "import { query } from '@/lib/database/db';\nexport const x = query;\n"
    );
    const malos = listar(raiz).hallazgos.filter((h: any) => h.regla === 'ui-no-infraestructura');
    expect(malos.some((h: any) => h.desde === 'components/Malo.tsx')).toBe(true);
    rmSync(join(raiz, 'components', 'Malo.tsx'));
  });

  it('detecta un import dinámico que intenta esquivar la regla', () => {
    writeFileSync(
      join(raiz, 'components', 'Dinamico.tsx'),
      "export async function f() { return import('@/lib/database/db'); }\n"
    );
    const malos = listar(raiz).hallazgos.filter((h: any) => h.regla === 'ui-no-infraestructura');
    expect(malos.some((h: any) => h.desde === 'components/Dinamico.tsx')).toBe(true);
    rmSync(join(raiz, 'components', 'Dinamico.tsx'));
  });

  it('detecta un import por ruta relativa', () => {
    writeFileSync(
      join(raiz, 'components', 'Relativo.tsx'),
      "import { query } from '../lib/database/db';\nexport const x = query;\n"
    );
    const malos = listar(raiz).hallazgos.filter((h: any) => h.regla === 'ui-no-infraestructura');
    expect(malos.some((h: any) => h.desde === 'components/Relativo.tsx')).toBe(true);
    rmSync(join(raiz, 'components', 'Relativo.tsx'));
  });

  it('falla con código 1 cuando aparece una dependencia prohibida sin excepción', () => {
    writeFileSync(
      join(raiz, 'components', 'Malo.tsx'),
      "import { query } from '@/lib/database/db';\nexport const x = query;\n"
    );
    const r = correr(raiz);
    expect(r.codigo).toBe(1);
    expect(r.salida).toContain('prohibidas nuevas');
    rmSync(join(raiz, 'components', 'Malo.tsx'));
  });

  it('falla cuando una excepción registrada deja de aplicar', () => {
    writeFileSync(
      join(raiz, 'docs', 'arquitectura', 'excepciones.json'),
      JSON.stringify(
        {
          'ui-no-infraestructura|components/YaNoExiste.tsx|lib/database/db': {
            regla: 'ui-no-infraestructura',
            desde: 'components/YaNoExiste.tsx',
            hacia: 'lib/database/db',
            motivo: 'obsoleta',
            responsable: 'nadie',
            condicion: 'ya no aplica'
          }
        },
        null,
        2
      )
    );
    const r = correr(raiz);
    expect(r.codigo).toBe(1);
    expect(r.salida).toContain('ya no aplican');
    writeFileSync(join(raiz, 'docs', 'arquitectura', 'excepciones.json'), '{}\n');
  });

  it('la ruta consume el módulo por su API pública sin hallazgos', () => {
    mkdirSync(join(raiz, 'modules', 'personal', 'horas-extras'), { recursive: true });
    mkdirSync(join(raiz, 'app', 'api', 'overtime'), { recursive: true });
    writeFileSync(join(raiz, 'modules', 'personal', 'index.ts'), 'export const x = 1;\n');
    writeFileSync(
      join(raiz, 'modules', 'personal', 'contracts.ts'),
      'export interface A { a: number }\n'
    );
    writeFileSync(
      join(raiz, 'modules', 'personal', 'horas-extras', 'repositorio.ts'),
      "import { query } from '@/lib/database/db';\nexport const buscar = query;\n"
    );
    writeFileSync(
      join(raiz, 'app', 'api', 'overtime', 'route.ts'),
      "import { x } from '@/modules/personal';\nexport const y = x;\n"
    );
    const reglas = ['modulo-solo-api-publica', 'ui-consume-modulos-por-http'];
    for (const regla of reglas) {
      expect(listar(raiz).hallazgos.filter((h: any) => h.regla === regla)).toHaveLength(0);
    }
  });

  it('detecta un import al interior de un módulo desde fuera del módulo', () => {
    writeFileSync(
      join(raiz, 'app', 'api', 'overtime', 'Malo.ts'),
      "import { buscar } from '@/modules/personal/horas-extras/repositorio';\nexport const y = buscar;\n"
    );
    const malos = listar(raiz).hallazgos.filter((h: any) => h.regla === 'modulo-solo-api-publica');
    expect(
      malos.some(
        (h: any) =>
          h.desde === 'app/api/overtime/Malo.ts' &&
          h.hacia === 'modules/personal/horas-extras/repositorio.ts'
      )
    ).toBe(true);
    rmSync(join(raiz, 'app', 'api', 'overtime', 'Malo.ts'));
  });

  it('detecta un componente que importa un módulo, pero permite sus contratos', () => {
    writeFileSync(
      join(raiz, 'components', 'Malo.tsx'),
      "import { x } from '@/modules/personal';\nexport const y = x;\n"
    );
    const malos = listar(raiz).hallazgos.filter(
      (h: any) => h.regla === 'ui-consume-modulos-por-http'
    );
    expect(malos.some((h: any) => h.desde === 'components/Malo.tsx')).toBe(true);
    rmSync(join(raiz, 'components', 'Malo.tsx'));

    writeFileSync(
      join(raiz, 'components', 'Contratos.tsx'),
      "import type { A } from '@/modules/personal/contracts';\nexport type B = A;\n"
    );
    expect(
      listar(raiz).hallazgos.filter((h: any) => h.regla === 'ui-consume-modulos-por-http')
    ).toHaveLength(0);
    rmSync(join(raiz, 'components', 'Contratos.tsx'));
  });

  it('un route handler fuera de app/api consume el módulo; una página no', () => {
    // iclock/dahua quedan fuera de /api a propósito (hablan HTTP plano sin
    // middleware): son adaptadores de servidor como cualquier route.ts.
    mkdirSync(join(raiz, 'app', 'iclock', 'cdata'), { recursive: true });
    writeFileSync(
      join(raiz, 'app', 'iclock', 'cdata', 'route.ts'),
      "import { x } from '@/modules/personal';\nexport const y = x;\n"
    );
    expect(
      listar(raiz).hallazgos.filter((h: any) => h.regla === 'ui-consume-modulos-por-http')
    ).toHaveLength(0);
    rmSync(join(raiz, 'app', 'iclock', 'cdata', 'route.ts'));

    // Una página sigue siendo UI: sólo contracts.ts.
    mkdirSync(join(raiz, 'app', 'pagina'), { recursive: true });
    writeFileSync(
      join(raiz, 'app', 'pagina', 'page.tsx'),
      "import { x } from '@/modules/personal';\nexport default function P() { return x; }\n"
    );
    const malos = listar(raiz).hallazgos.filter(
      (h: any) => h.regla === 'ui-consume-modulos-por-http'
    );
    expect(malos.some((h: any) => h.desde === 'app/pagina/page.tsx')).toBe(true);
    rmSync(join(raiz, 'app', 'pagina'), { recursive: true });
  });

  it('sólo la infraestructura de los módulos resuelve el contexto transaccional', () => {
    mkdirSync(join(raiz, 'lib', 'transaccion'), { recursive: true });
    mkdirSync(join(raiz, 'lib', 'services'), { recursive: true });
    writeFileSync(
      join(raiz, 'lib', 'transaccion', 'infraestructura.ts'),
      'export function resolverTransaccion() { return null; }\n'
    );

    // Sano: la infraestructura del módulo es la autorizada.
    writeFileSync(
      join(raiz, 'modules', 'personal', 'horas-extras', 'repositorio.ts'),
      "import { resolverTransaccion } from '@/lib/transaccion/infraestructura';\nexport const r = resolverTransaccion;\n"
    );
    expect(
      listar(raiz).hallazgos.filter((h: any) => h.regla === 'infra-transaccional-autorizada')
    ).toHaveLength(0);

    // Prohibido: un servicio resuelve el contexto por su cuenta.
    writeFileSync(
      join(raiz, 'lib', 'services', 'Malo.ts'),
      "import { resolverTransaccion } from '@/lib/transaccion/infraestructura';\nexport const r = resolverTransaccion;\n"
    );
    const malos = listar(raiz).hallazgos.filter(
      (h: any) => h.regla === 'infra-transaccional-autorizada'
    );
    expect(malos.some((h: any) => h.desde === 'lib/services/Malo.ts')).toBe(true);
    rmSync(join(raiz, 'lib', 'services', 'Malo.ts'));
  });

  it('ningún servicio puede usar el puente transaccional heredado', () => {
    mkdirSync(join(raiz, 'lib', 'transaccion'), { recursive: true });
    mkdirSync(join(raiz, 'lib', 'services'), { recursive: true });
    writeFileSync(
      join(raiz, 'lib', 'transaccion', 'compatibilidad.ts'),
      'export function conContextoOperacionExistente() { return null; }\n'
    );
    writeFileSync(
      join(raiz, 'lib', 'services', 'SaleService.ts'),
      "import { conContextoOperacionExistente } from '@/lib/transaccion/compatibilidad';\nexport const f = conContextoOperacionExistente;\n"
    );
    expect(
      listar(raiz).hallazgos.filter((h: any) => h.regla === 'puente-transaccional-heredado')
    ).toHaveLength(1);

    writeFileSync(
      join(raiz, 'lib', 'services', 'Malo.ts'),
      "import { conContextoOperacionExistente } from '@/lib/transaccion/compatibilidad';\nexport const f = conContextoOperacionExistente;\n"
    );
    const malos = listar(raiz).hallazgos.filter(
      (h: any) => h.regla === 'puente-transaccional-heredado'
    );
    expect(malos.some((h: any) => h.desde === 'lib/services/Malo.ts')).toBe(true);
    rmSync(join(raiz, 'lib', 'services', 'SaleService.ts'));
    rmSync(join(raiz, 'lib', 'services', 'Malo.ts'));
  });
});

describe('cobertura de los nuevos limites', () => {
  it.each(['ventas', 'operacion', 'caja', 'clientes', 'configuracion', 'salud', 'futuro'])(
    'detecta ciclos de %s aunque no exista en un mapa manual',
    modulo => {
      const raiz = repoDePrueba();
      try {
        for (const nombre of [modulo, 'contraparte'])
          mkdirSync(join(raiz, 'modules', nombre), { recursive: true });
        writeFileSync(
          join(raiz, 'modules', modulo, 'index.ts'),
          `export { x } from '@/modules/contraparte';`
        );
        writeFileSync(
          join(raiz, 'modules', 'contraparte', 'index.ts'),
          `export { x } from '@/modules/${modulo}';`
        );
        expect(correr(raiz).codigo).toBe(1);
        expect(listar(raiz).hallazgos.some((h: any) => h.regla === 'sin-ciclos')).toBe(true);
      } finally {
        rmSync(raiz, { recursive: true, force: true });
      }
    }
  );

  it('permite HTTP a workflow, pero bloquea modulo a workflow y workflow a driver', () => {
    const raiz = repoDePrueba();
    try {
      mkdirSync(join(raiz, 'workflows'), { recursive: true });
      mkdirSync(join(raiz, 'app/api/cobrar'), { recursive: true });
      mkdirSync(join(raiz, 'modules/ventas'), { recursive: true });
      writeFileSync(join(raiz, 'workflows/cobrar.ts'), 'export const cobrar = 1;');
      writeFileSync(
        join(raiz, 'app/api/cobrar/route.ts'),
        "export { cobrar } from '@/workflows/cobrar';"
      );
      expect(correr(raiz).codigo).toBe(0);
      writeFileSync(
        join(raiz, 'modules/ventas/index.ts'),
        "export { cobrar } from '@/workflows/cobrar';"
      );
      expect(listar(raiz).hallazgos.some((h: any) => h.regla === 'modulos-sin-workflows')).toBe(
        true
      );
      writeFileSync(
        join(raiz, 'workflows/cobrar.ts'),
        "import { query } from '@/lib/database/db'; export const cobrar = query;"
      );
      expect(listar(raiz).hallazgos.some((h: any) => h.regla === 'workflow-sin-persistencia')).toBe(
        true
      );
    } finally {
      rmSync(raiz, { recursive: true, force: true });
    }
  });
});

describe('excepciones del repositorio real', () => {
  it('bloquea servidor transitivo en contratos y permite referencias sólo de tipos', () => {
    const raiz = repoDePrueba();
    try {
      mkdirSync(join(raiz, 'modules/clientes'), { recursive: true });
      writeFileSync(
        join(raiz, 'modules/clientes/repositorio.ts'),
        "import 'server-only'; export const dato = 1; export interface Dato { id: string }"
      );
      writeFileSync(
        join(raiz, 'modules/clientes/puente.ts'),
        "export { dato } from './repositorio';"
      );
      writeFileSync(
        join(raiz, 'modules/clientes/contracts.ts'),
        "export { dato } from './puente';"
      );
      expect(listar(raiz).hallazgos.some((h: any) => h.regla === 'contratos-sin-servidor')).toBe(
        true
      );
      writeFileSync(
        join(raiz, 'modules/clientes/contracts.ts'),
        "export type { Dato } from './repositorio';"
      );
      expect(listar(raiz).hallazgos.some((h: any) => h.regla === 'contratos-sin-servidor')).toBe(
        false
      );
    } finally {
      rmSync(raiz, { recursive: true, force: true });
    }
  });

  it('bloquea SQL y BaseRepository sobre tablas de otro propietario', () => {
    const raiz = repoDePrueba();
    try {
      mkdirSync(join(raiz, 'modules/caja'), { recursive: true });
      writeFileSync(
        join(raiz, 'modules/caja/repositorio.ts'),
        "export const sql = 'UPDATE usuarios SET estado = 0'; BaseRepository.insert(query, 'asistencias', {});"
      );
      const hallazgos = listar(raiz).hallazgos.filter(
        (h: any) => h.regla === 'tabla-unico-propietario'
      );
      expect(hallazgos).toHaveLength(2);
      expect(correr(raiz).codigo).toBe(1);
      writeFileSync(
        join(raiz, 'modules/caja/repositorio.ts'),
        "export const sql = 'UPDATE cajas SET estado = 0';"
      );
      expect(correr(raiz).codigo).toBe(0);
    } finally {
      rmSync(raiz, { recursive: true, force: true });
    }
  });

  it('no inventa ciclos a partir de rutas HTTP, comentarios o imports de tipos', () => {
    const raiz = repoDePrueba();
    try {
      for (const ruta of ['modules/caja', 'modules/ventas', 'app/api/caja'])
        mkdirSync(join(raiz, ruta), { recursive: true });
      writeFileSync(
        join(raiz, 'modules/caja/index.ts'),
        "import type { Venta } from '@/modules/ventas/contracts'; // import { x } from '@/modules/ventas';\nexport const x = 1;"
      );
      writeFileSync(
        join(raiz, 'modules/ventas/contracts.ts'),
        'export interface Venta { id: string }'
      );
      writeFileSync(join(raiz, 'modules/ventas/index.ts'), "export { x } from '@/modules/caja';");
      writeFileSync(join(raiz, 'app/api/caja/route.ts'), "export { x } from '@/modules/ventas';");
      expect(correr(raiz).codigo).toBe(0);
      writeFileSync(join(raiz, 'modules/caja/index.ts'), "export { x } from '@/modules/ventas';");
      expect(listar(raiz).hallazgos.some((h: any) => h.regla === 'sin-ciclos')).toBe(true);
    } finally {
      rmSync(raiz, { recursive: true, force: true });
    }
  });

  it('toda excepción registrada tiene motivo, responsable y condición', () => {
    const ruta = join(RAIZ, 'docs', 'arquitectura', 'excepciones.json');
    if (!existsSync(ruta)) throw new Error('falta docs/arquitectura/excepciones.json');
    const exc = JSON.parse(readFileSync(ruta, 'utf8'));
    const claves = Object.keys(exc);
    expect(claves).toHaveLength(0);
    for (const k of claves) {
      expect(exc[k].motivo, `${k} sin motivo`).toBeTruthy();
      expect(exc[k].responsable, `${k} sin responsable`).toBeTruthy();
      expect(exc[k].condicion, `${k} sin condición de eliminación`).toBeTruthy();
    }
  });

  it('la puerta pasa en el repositorio real', () => {
    const r = correr(RAIZ);
    expect(r.codigo).toBe(0);
    expect(r.salida).toContain('Sin dependencias prohibidas nuevas');
  }, 120_000);
});
