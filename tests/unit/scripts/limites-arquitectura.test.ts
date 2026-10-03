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
  readFileSync
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
});

describe('excepciones del repositorio real', () => {
  it('toda excepción registrada tiene motivo, responsable y condición', () => {
    const ruta = join(RAIZ, 'docs', 'arquitectura', 'excepciones.json');
    if (!existsSync(ruta)) throw new Error('falta docs/arquitectura/excepciones.json');
    const exc = JSON.parse(readFileSync(ruta, 'utf8'));
    const claves = Object.keys(exc);
    expect(claves.length).toBeGreaterThan(0);
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
