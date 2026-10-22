/**
 * Utilidades compartidas por las pruebas del control de límites entre módulos.
 *
 * Viven en un módulo aparte para que la puerta se pueda probar desde los tres
 * archivos que la dividen (reglas de imports, cobertura de ciclos y excepciones).
 * Un solo archivo tardaba más de 60 s en la suite completa, y Vitest interpreta
 * ese silencio del worker como un timeout de su RPC
 * (`Timeout calling "onTaskUpdate"`).
 */
import { execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, cpSync, mkdirSync, symlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

export const RAIZ = resolve(process.cwd());
export const SCRIPT_REL = join('scripts', 'arquitectura', 'limites.mjs');

/** Ejecuta la puerta en modo de validación y devuelve salida y código de salida. */
export function correr(raiz: string): { codigo: number; salida: string } {
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
export function listar(raiz: string): any {
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
export function repoDePrueba(): string {
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
