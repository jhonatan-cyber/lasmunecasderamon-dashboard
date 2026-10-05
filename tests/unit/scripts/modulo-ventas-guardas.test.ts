/**
 * Guardas del módulo de ventas contra la mezcla que la fase 5 elimina primero.
 *
 * La primera casilla de la fase 5 pide «extraer el SQL que sigue en rutas de
 * ventas». Las tres rutas de anulación lo tenían (corte 11) y ya no lo tienen;
 * este test convierte esa casilla en algo que falla si alguien vuelve a escribir
 * una consulta dentro de un manejador HTTP.
 *
 * No se aplica a todo `app/api`: hay 35 rutas con SQL que pertenecen a las fases
 * 5 y 6. Cuando cada dominio pase por su módulo, esta lista crece ruta a ruta.
 */
import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';

const RAIZ = resolve(__dirname, '..', '..', '..');

/** Rutas del dominio ventas ya extraídas: aquí no debe quedar SQL. */
const RUTAS_SIN_SQL = ['app/api/ventas', 'app/api/sales'];

/**
 * `SELECT`, `INSERT INTO`, `UPDATE` y `DELETE FROM` seguidos de un identificador.
 * Exige el espacio en blanco para no enganchar palabras del español o nombres de
 * funciones; los JOIN y el resto no importan porque toda consulta empieza por una
 * de estas cuatro. Sin `\b` al final: después de `SELECT i` de "SELECT id" no hay
 * frontera de palabra, y una frontera sí rompe el patrón.
 */
const CONSULTA = /\b(SELECT\s+[\w(]|INSERT\s+INTO|UPDATE\s+\w|DELETE\s+FROM)/;

function archivos(dir: string): string[] {
  const encontrados: string[] = [];
  for (const entrada of readdirSync(dir)) {
    const ruta = join(dir, entrada);
    if (statSync(ruta).isDirectory()) encontrados.push(...archivos(ruta));
    else if (entrada.endsWith('.ts') || entrada.endsWith('.tsx')) encontrados.push(ruta);
  }
  return encontrados;
}

describe('guardas del módulo de ventas', () => {
  it('ninguna ruta HTTP de ventas contiene SQL', () => {
    const ofensores: string[] = [];
    for (const base of RUTAS_SIN_SQL) {
      const dir = join(RAIZ, base);
      let existentes: string[];
      try {
        existentes = archivos(dir);
      } catch {
        continue; // el dominio todavía no tiene ese grupo de rutas
      }
      for (const archivo of existentes) {
        const fuente = readFileSync(archivo, 'utf8');
        if (CONSULTA.test(fuente))
          ofensores.push(
            archivo
              .slice(RAIZ.length + 1)
              .split('\\')
              .join('/')
          );
      }
    }
    expect(
      ofensores,
      `Las rutas autentican, validan el transporte, llaman un caso de uso y traducen la respuesta: el SQL vive en modules/ventas.\n${ofensores.join('\n')}`
    ).toEqual([]);
  });

  it('el módulo de ventas declara su API como server-only', () => {
    const fuente = readFileSync(join(RAIZ, 'modules', 'ventas', 'index.ts'), 'utf8');
    expect(fuente).toContain("import 'server-only'");
  });
});
