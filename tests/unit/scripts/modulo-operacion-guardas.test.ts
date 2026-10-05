/**
 * Guardas de los módulos de Operación y Personal contra la mezcla que las fases 5
 * y 6 eliminan.
 *
 * Estas rutas ya no ejecutan SQL: viven en `modules/operacion` (cuentas y
 * servicios) y `modules/personal` (anticipos). Estos tests convierten ese hecho en
 * algo que falla si alguien vuelve a escribir una consulta dentro de un manejador
 * HTTP.
 *
 * No se aplica a todo `app/api`: cada grupo entra en su lista a medida que su
 * dominio pasa por su módulo. Cuando se migren las últimas rutas, la lista será
 * `app/api` entero.
 */
import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';

const RAIZ = resolve(__dirname, '..', '..', '..');

/** Rutas ya extraídas: aquí no debe quedar SQL. */
const RUTAS_SIN_SQL = [
  'app/api/ventas',
  'app/api/sales',
  'app/api/servicios',
  'app/api/cuentas',
  'app/api/anticipos'
];

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

function ofensoresSql(): string[] {
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
  return ofensores;
}

describe('guardas de los modulos ya extraidos de las rutas', () => {
  it('ninguna ruta HTTP migrada contiene SQL', () => {
    const ofensores = ofensoresSql();
    expect(
      ofensores,
      `Las rutas autentican, validan el transporte, llaman un caso de uso y traducen la respuesta: el SQL vive en modules/.\n${ofensores.join('\n')}`
    ).toEqual([]);
  });

  it('la guarda detecta SQL si alguien lo reintroduce', () => {
    // Autocomprobación: una guarda que nunca falla no es una guarda. Se aplica el
    // mismo regex a una cadena con las cuatro formas de consulta.
    for (const sql of [
      'const r = await query("SELECT id FROM usuarios")',
      "await query('INSERT INTO cajas (id) VALUES (?)')",
      'await query("UPDATE cajas SET efectivo = 0")',
      "await query('DELETE FROM cajas WHERE id = ?')"
    ]) {
      expect(CONSULTA.test(sql), `debía detectar: ${sql}`).toBe(true);
    }
    // Y no debe dispararse con texto corriente en español ni con nombres de
    // funciones que empiezan igual.
    for (const inocuo of [
      '// se inserta un registro nuevo',
      'const selector = document.querySelector("#x")',
      'export const UPDATE = 1;'
    ]) {
      expect(CONSULTA.test(inocuo), `no debía detectar: ${inocuo}`).toBe(false);
    }
  });

  it('los modulos con rutas migradas declaran su API como server-only', () => {
    for (const modulo of ['ventas', 'operacion', 'personal']) {
      const fuente = readFileSync(join(RAIZ, 'modules', modulo, 'index.ts'), 'utf8');
      expect(fuente, `modules/${modulo}/index.ts`).toContain("import 'server-only'");
    }
  });
});
