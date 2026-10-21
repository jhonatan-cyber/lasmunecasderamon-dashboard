// @vitest-environment node
import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  TRANSFER_CREATE_PERMISSION,
  TRANSFER_RESOLVE_PERMISSION
} from '@/lib/constants/transferPermissions';
import { toMatrixAction } from '@/lib/constants/route-permissions';

/**
 * `lib/constants/transferPermissions` es la fuente única de los pares del
 * flujo de traspasos: los usan el hook de UI, el repositorio (chequeo previo)
 * y el aviso push. Las rutas declaran el par como literal en su `withRoute`
 * (el test de alineación parsea el código fuente y exige el literal), así que
 * este test lee esos archivos y falla si el literal y la constante se separan.
 */

function parDeclarado(ruta: string, metodo: string): { module: string; action: string } {
  const source = fs.readFileSync(path.join(process.cwd(), 'app/api', ruta), 'utf8');
  const start = source.indexOf(`export const ${metodo}`);
  expect(start, `${ruta}: falta el export ${metodo}`).toBeGreaterThanOrEqual(0);
  const next = source.indexOf('export ', start + 10);
  const snippet = source.slice(start, next === -1 ? source.length : next);
  const modulo = /module:\s*'([a-z_]+)'/.exec(snippet)?.[1];
  const accion = /action:\s*'([a-z_]+)'/.exec(snippet)?.[1];
  expect(modulo, `${ruta} ${metodo}: sin module`).toBeDefined();
  expect(accion, `${ruta} ${metodo}: sin action`).toBeDefined();
  return { module: modulo!, action: accion! };
}

describe('pares de permisos de traspasos: fuente única', () => {
  it('las rutas declaran exactamente los pares de las constantes', () => {
    // El resolve viaja idéntico: la matriz no tiene traducción para el par.
    expect(parDeclarado('transfers/route.ts', 'PATCH')).toEqual({
      ...TRANSFER_RESOLVE_PERMISSION
    });
    expect(parDeclarado('transfers/[id]/accept/route.ts', 'POST')).toEqual({
      ...TRANSFER_RESOLVE_PERMISSION
    });
    // Crear se declara en la matriz como el flag que concede el par del catálogo.
    expect(parDeclarado('bar/route.ts', 'POST')).toEqual({
      module: TRANSFER_CREATE_PERMISSION.module,
      action: toMatrixAction(TRANSFER_CREATE_PERMISSION.action)
    });
  });

  it('el repositorio, el hook y el aviso push cuelgan de las mismas constantes', () => {
    const leer = (ruta: string) => fs.readFileSync(path.join(process.cwd(), ruta), 'utf8');

    const repositorio = leer('modules/inventario/transferencias/repositorio.ts');
    expect(repositorio).toContain('TRANSFER_RESOLVE_PERMISSION');
    expect(repositorio).not.toContain("IN ('barman', 'administrador')");

    const hook = leer('hooks/shared/useTransferPermissions.ts');
    expect(hook).toContain('TRANSFER_RESOLVE_PERMISSION');
    expect(hook).toContain('TRANSFER_CREATE_PERMISSION');

    const infra = leer('modules/inventario/transferencias/infraestructura.ts');
    expect(infra).toContain('sendPushByPermission');
    expect(infra).not.toContain('sendPushByRole');
  });
});
