/**
 * Guarda de las rutas HTTP contra la mezcla que las fases 5 y 6 eliminan.
 *
 * Ninguna ruta ejecuta SQL: el SQL vive en `modules/<mod>/…/repositorio.ts` y una
 * ruta autentica, valida el transporte, llama un caso de uso y traduce la respuesta.
 * Esta guarda convierte ese hecho en algo que falla si alguien vuelve a escribir una
 * consulta dentro de un manejador HTTP. Cubre `app/api` entero porque para el corte
 * 12 ya no queda ninguna excepción.
 *
 * También cubre el otro camino de la misma mezcla: importar `lib/database/db` desde
 * una ruta. Una ruta puede no escribir SQL y aun así atarse al driver — así pasó con
 * `app/api/health`, que sólo llamaba a `verificarConexion()` y aun así impedía cerrar
 * el censo. El límite arquitectónico es el import, no el texto de la consulta, que es
 * como lo mide `scripts/arquitectura/analisis.mjs` en `usaDriverDe`.
 *
 * Los dos tests siguientes son la diferencia entre una guarda y una decorator: el
 * segundo comprueba que el mismo detector sí reacciona ante SQL real.
 */
import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';

const RAIZ = resolve(__dirname, '..', '..', '..');

/** Rutas ya extraídas: aquí no debe quedar SQL. */
const RUTAS_SIN_SQL = ['app/api'];

/**
 * `SELECT`, `INSERT INTO`, `UPDATE` y `DELETE FROM` seguidos de un identificador.
 * Exige el espacio en blanco para no enganchar palabras del español o nombres de
 * funciones; los JOIN y el resto no importan porque toda consulta empieza por una
 * de estas cuatro. Sin `\b` al final: después de `SELECT i` de "SELECT id" no hay
 * frontera de palabra, y una frontera sí rompe el patrón.
 */
const CONSULTA = /\b(SELECT\s+[\w(]|INSERT\s+INTO|UPDATE\s+\w|DELETE\s+FROM)/;

/**
 * Import al driver, estático o dinámico, con o sin extensión y con o sin barra final.
 * `lib/database` a secas no es el driver: es la carpeta que lo contiene.
 */
const IMPORT_DRIVER = /(?:from|import)\s*\(?\s*['"]@\/lib\/database\/db(?:\/index)?(?:\.ts)?['"]/;

function archivos(dir: string): string[] {
  const encontrados: string[] = [];
  for (const entrada of readdirSync(dir)) {
    const ruta = join(dir, entrada);
    if (statSync(ruta).isDirectory()) encontrados.push(...archivos(ruta));
    else if (entrada.endsWith('.ts') || entrada.endsWith('.tsx')) encontrados.push(ruta);
  }
  return encontrados;
}

function rutasAnalizadas(): string[] {
  const encontradas: string[] = [];
  for (const base of RUTAS_SIN_SQL) {
    const dir = join(RAIZ, base);
    try {
      encontradas.push(...archivos(dir));
    } catch {
      continue; // el dominio todavía no tiene ese grupo de rutas
    }
  }
  return encontradas;
}

/** Ruta relativa a la raíz del repo, con `/` para que el mensaje sea legible. */
function relativa(archivo: string): string {
  return archivo
    .slice(RAIZ.length + 1)
    .split('\\')
    .join('/');
}

describe('guardas de las rutas http', () => {
  it('ninguna ruta HTTP contiene SQL', () => {
    const ofensores = rutasAnalizadas()
      .filter(archivo => CONSULTA.test(readFileSync(archivo, 'utf8')))
      .map(relativa);
    expect(
      ofensores,
      `Las rutas autentican, validan el transporte, llaman un caso de uso y traducen la respuesta: el SQL vive en modules/.\n${ofensores.join('\n')}`
    ).toEqual([]);
  });

  it('ninguna ruta HTTP importa el driver de base de datos', () => {
    const ofensores = rutasAnalizadas()
      .filter(archivo => IMPORT_DRIVER.test(readFileSync(archivo, 'utf8')))
      .map(relativa);
    expect(
      ofensores,
      `El driver se importa desde modules/<mod>/…/repositorio.ts, nunca desde una ruta. Si la consulta es nueva, nace en su módulo; si ya existe, la ruta debe llamar el caso de uso.\n${ofensores.join('\n')}`
    ).toEqual([]);
  });

  it('la guarda detecta SQL si alguien lo reintroduce', () => {
    // Autocomprobación: una guarda que nunca falla no es una guarda. Se aplica el
    // mismo detector a una cadena con las cuatro formas de consulta.
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
    // El detector de import al driver se prueba aparte: reconoce el import
    // estático, el dinámico y la barra final, y no confunde la carpeta con el módulo.
    for (const atado of [
      "import { query } from '@/lib/database/db';",
      'const { query } = await import("@/lib/database/db");',
      "export { withTransaction } from '@/lib/database/db/index';",
      "import db from '@/lib/database/db.ts';"
    ]) {
      expect(IMPORT_DRIVER.test(atado), `debía detectar: ${atado}`).toBe(true);
    }
    for (const suelto of [
      "import { getPool } from '@/lib/database';",
      "import { registrarAuditoria } from '@/lib/database/auditoria';",
      "import { guardarLog } from '@/lib/logUtils';"
    ]) {
      expect(IMPORT_DRIVER.test(suelto), `no debía detectar: ${suelto}`).toBe(false);
    }
  });

  it('los modulos con rutas migradas declaran su API como server-only', () => {
    for (const modulo of [
      'ventas',
      'operacion',
      'personal',
      'identidad',
      'configuracion',
      'clientes',
      'caja',
      'asistencia',
      'inventario',
      'salud'
    ]) {
      const fuente = readFileSync(join(RAIZ, 'modules', modulo, 'index.ts'), 'utf8');
      expect(fuente, `modules/${modulo}/index.ts`).toContain("import 'server-only'");
    }
  });
});
