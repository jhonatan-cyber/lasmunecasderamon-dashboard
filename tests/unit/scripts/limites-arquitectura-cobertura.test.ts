/**
 * Cobertura del control de límites: ciclos entre módulos, excepciones del
 * repositorio real y el paso de la puerta completa.
 *
 * Vive aparte de `limites-arquitectura.test.ts` para que ningún archivo de la
 * suite se acerque al timeout de 60 s del RPC de Vitest. Antes de dividirlo,
 * las 25 pruebas juntas tardaban ~63 s en la suite completa y el worker emitía
 * un `Timeout calling "onTaskUpdate"` aunque todo pasara. Las excepciones del
 * repositorio real, la tercera mitad, viven en `limites-arquitectura-excepciones.test.ts`.
 */
import { describe, it, expect } from 'vitest';
import { rmSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { correr, listar, repoDePrueba } from './limites-helpers';

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
