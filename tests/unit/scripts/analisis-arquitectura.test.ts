/**
 * El diagnóstico de Fase 0 es la línea base de la que se mide toda la migración
 * al monolito modular, así que sus números tienen que ser reproducibles y no
 * pueden depender de la basura que haya en el disco.
 *
 * Estos tests fijan las dos trampas que ya se hicieron durante la redacción:
 * contar el driver por llamadas en vez de por imports (daba 15 rutas en lugar
 * de 36) y analizar el sistema de archivos en vez de lo que git considera parte
 * del proyecto (sumaba los 127 scripts de `_tmp_real/`, que está ignorado).
 */
import { describe, it, expect, beforeAll } from 'vitest';
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const RAIZ = resolve(__dirname, '..', '..', '..');
const ANALISIS = resolve(RAIZ, 'docs', 'arquitectura', 'analisis.json');

interface Informe {
  resumen: {
    archivos: number;
    rutas: number;
    rutasApiConSqlDirecto: number;
    sqlFueraDeRepositorio: number;
    tablasConEscritoresMultiples: number;
    ciclos: number;
    procesosPeriodicos: number;
    caches: number;
    rutasSinWrapper: number;
  };
  rutas: Array<{ ruta: string; nivel: string; usaDriver: boolean; metodos: string[] }>;
  sqlFueraDeRepositorio: Array<{ archivo: string; capa: string; escribe: string[] }>;
  escriturasCruzadas: Array<{ tabla: string; escritores: string[]; modulos: string[] }>;
  transacciones: Array<{ archivo: string; capa: string }>;
  ciclos: string[][];
}

let informe: Informe;

beforeAll(() => {
  execFileSync('node', ['scripts/arquitectura/analisis.mjs', '--json', '--corto'], {
    cwd: RAIZ,
    encoding: 'utf8'
  });
  informe = JSON.parse(readFileSync(ANALISIS, 'utf8')) as Informe;
}, 120_000);

describe('analisis de arquitectura (Fase 0)', () => {
  it('escribe un informe utilizable', () => {
    expect(existsSync(ANALISIS)).toBe(true);
    expect(informe.resumen.archivos).toBeGreaterThan(500);
    expect(informe.resumen.rutas).toBeGreaterThan(100);
  });

  it('detecta el driver por import, no por llamada', () => {
    // Regresión: contar sólo llamadas a query( dio 15 de 36 rutas, porque las
    // que importan los símbolos y los reexportan no dejaban rastro de llamada.
    const conImport = informe.rutas.filter(r => r.usaDriver);
    expect(conImport.length).toBeGreaterThanOrEqual(30);
    // Coincide con el conteo agregado del informe, que viene del mismo grafo.
    expect(conImport.length).toBe(informe.resumen.rutasApiConSqlDirecto);
  });

  it('no analiza archivos que git ignora', () => {
    // `_tmp_real/` está en .gitignore: si se colara, los números de SQL y de
    // archivos crecerían sin que cambie el código de la aplicación.
    expect(informe.sqlFueraDeRepositorio.some(x => x.archivo.startsWith('_tmp_real'))).toBe(false);
    expect(informe.resumen.archivos).toBeLessThan(2000);
  });

  it('no cuenta los repositorios como SQL fuera de repositorios', () => {
    const enRepo = informe.sqlFueraDeRepositorio.filter(
      x =>
        x.archivo.startsWith('lib/repositories/') ||
        (/^modules\//.test(x.archivo) && /(?:repositorio|Repositorio)\.ts$/.test(x.archivo))
    );
    expect(enRepo).toHaveLength(0);
  });

  it('inventa todas las rutas con SQL directo dentro de app/api', () => {
    const deApi = informe.sqlFueraDeRepositorio.filter(x => x.capa === 'app/api');
    expect(deApi.length).toBe(informe.resumen.rutasApiConSqlDirecto);
  });

  it('detecta escrituras cruzadas con sus escritores', () => {
    for (const e of informe.escriturasCruzadas) {
      expect(e.escritores.length).toBeGreaterThan(1);
      expect(e.tabla).toMatch(/^[a-z_]+$/);
    }
  });

  it('preserva el flujo atómico de cobro de cuenta con venta', () => {
    // El plan lo declara requisito de migración: si desaparece la transacción
    // compartida, un cobro puede confirmar sin su venta.
    const atomico = informe.transacciones.some(t => t.archivo === 'lib/services/AccountService.ts');
    expect(atomico).toBe(true);
  });

  it('detecta los procesos periódicos que la fase 3 tendrá que electrodear', () => {
    expect(informe.resumen.procesosPeriodicos).toBeGreaterThan(0);
  });

  it('clasifica el nivel de acceso de cada ruta sin inventar permisos', () => {
    const permitidos = ['publico', 'administrator', 'authenticated', 'SIN_WRAPPER'];
    for (const r of informe.rutas) {
      expect(permitidos.includes(r.nivel) || r.nivel.includes('.')).toBe(true);
    }
  });
});
