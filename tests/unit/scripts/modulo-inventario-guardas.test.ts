/**
 * Guardas del módulo de inventario contra la dependencia que más fácil se
 * reintroduce sin que nadie lo note: volver a leer inventario desde la capa
 * heredada.
 *
 * `pnpm arquitectura:limites` mide las reglas del plan, pero la dependencia que
 * estos tests fijan no estaba en la puerta porque era tolerable durante la
 * transición (el módulo importaba los helpers puros de `inventoryHelpers`). Con
 * la fase 4 cerrada, lo que queda prohibido es concreto y verificable:
 *
 *   A. El módulo no puede leer SQL heredado (`InventoryRepository`) ni tipos de
 *      fila (`inventoryTypes`). Los helpers puros de mapeo y EAN sí se permiten,
 *      porque son funciones puras y su mudanza está anotada para la fase 7.
 *   B. Nadie fuera del módulo puede volver a usar `InventoryRepository`: la UI y
 *      las rutas leen los DTO desde `contracts.ts` y el servidor llama a la API
 *      del módulo.
 */
import { describe, it, expect } from 'vitest';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';

const RAIZ = resolve(__dirname, '..', '..', '..');

const RUTAS_MODULO = ['modules/inventario'];
const RUTAS_FUERA = ['app', 'components', 'hooks', 'lib'];

/** Tablas heredadas de inventario que ya no deben existir como puerta de entrada. */
const IMPORTES_PROHIBIDOS = [
  'lib/repositories/inventory/InventoryRepository',
  'lib/repositories/inventory/inventoryTypes'
];

function archivos(dir: string): string[] {
  const encontrados: string[] = [];
  for (const entrada of readdirSync(dir)) {
    const ruta = join(dir, entrada);
    if (statSync(ruta).isDirectory()) {
      encontrados.push(...archivos(ruta));
    } else if (/\.(ts|tsx)$/.test(entrada) && !ruta.includes(`${join('node_modules')}`)) {
      encontrados.push(ruta);
    }
  }
  return encontrados;
}

function relative(ruta: string): string {
  return ruta
    .slice(RAIZ.length + 1)
    .split('\\')
    .join('/');
}

function importa(ruta: string, objetivo: string): boolean {
  const fuente = readFileSync(ruta, 'utf8');
  // Cubre alias (`@/...`), ruta relativa y require/import dinámico: lo que
  // importa es el final de la ruta, no cómo se escribió.
  return new RegExp(`['"]([^'"]*)?${objetivo.replace(/\//g, '\\/')}['"]`).test(fuente);
}

describe('guardas del módulo de inventario', () => {
  it('A. ningún archivo del módulo lee SQL ni tipos de fila heredados', () => {
    const ofensores: string[] = [];
    for (const base of RUTAS_MODULO) {
      for (const archivo of archivos(join(RAIZ, base))) {
        for (const prohibido of IMPORTES_PROHIBIDOS) {
          if (importa(archivo, prohibido)) ofensores.push(`${relative(archivo)} → ${prohibido}`);
        }
      }
    }
    expect(
      ofensores,
      `El módulo de inventario ya es el dueño de sus tablas: usa sus repositorios o sus DTO de contracts.ts, no la capa heredada.\n${ofensores.join('\n')}`
    ).toEqual([]);
  });

  it('B. nadie fuera del módulo vuelve a usar InventoryRepository', () => {
    const ofensores: string[] = [];
    for (const base of RUTAS_FUERA) {
      for (const archivo of archivos(join(RAIZ, base))) {
        for (const prohibido of IMPORTES_PROHIBIDOS) {
          if (importa(archivo, prohibido)) ofensores.push(`${relative(archivo)} → ${prohibido}`);
        }
      }
    }
    expect(
      ofensores,
      `Fuera del módulo, el inventario se consume por su API pública o por contracts.ts.\n${ofensores.join('\n')}`
    ).toEqual([]);
  });

  it('D. la capa heredada de inventario ya no existe', () => {
    // Con los tipos de fila y los helpers puros movidos al módulo, este
    // directorio debe estar vacío: si vuelve a aparecer, algo ha vuelto a leer o
    // escribir inventario desde fuera de su dueño.
    const dir = join(RAIZ, 'lib', 'repositories', 'inventory');
    expect(
      existsSync(dir),
      'lib/repositories/inventory/ no debe existir: los tipos de fila y los helpers puros viven en modules/inventario.'
    ).toBe(false);
  });

  it('C. la UI no importa la API de servidor del módulo', () => {
    const ofensores: string[] = [];
    for (const base of ['app', 'components', 'hooks']) {
      for (const archivo of archivos(join(RAIZ, base))) {
        if (!archivo.includes(`${join('app', 'api')}`) && !importa(archivo, 'modules/inventario'))
          continue;
        // Las rutas pueden usar el módulo (es servidor); la UI no: index.ts es
        // server-only y sus DTO están en contracts.ts.
        if (archivo.includes(`${join('app', 'api')}`)) continue;
        if (importa(archivo, 'modules/inventario/contracts')) continue;
        ofensores.push(relative(archivo));
      }
    }
    expect(
      ofensores,
      `La UI consume los DTO desde modules/inventario/contracts; la API de servidor es solo para rutas y servicios.\n${ofensores.join('\n')}`
    ).toEqual([]);
  });
});
