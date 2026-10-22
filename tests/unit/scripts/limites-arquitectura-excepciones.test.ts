/**
 * Excepciones del repositorio real y paso de la puerta completa.
 *
 * Es la tercera mitad del control de límites, separada para que ningún archivo
 * de la suite se acerque al timeout de 60 s del RPC de Vitest: juntas, las tres
 * mitades tardaban ~63 s por archivo y el worker emitía un
 * `Timeout calling "onTaskUpdate"` aunque todo pasara.
 */
import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync, rmSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { RAIZ, correr, listar, repoDePrueba } from './limites-helpers';

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
      for (const ruta of ['modules/caja', 'modules/ventas', 'app/api/cash-register'])
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
      writeFileSync(
        join(raiz, 'app/api/cash-register/route.ts'),
        "export { x } from '@/modules/ventas';"
      );
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
