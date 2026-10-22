import { existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { BARRILES, TRAMOS, barrilesDelTramo, verificarContrato } from './contrato-barriles';

/**
 * Contrato público de los barriles de hooks. El mapa completo y el porqué del
 * reparto en tramos viven en `./contrato-barriles`. Este archivo cubre el
 * tramo `cuentas` (el barril `accounts` paga el grafo más pesado y va solo).
 */
describe('contrato público de los barriles de hooks', () => {
  it('el contrato cubre exactamente los barriles existentes en disco', () => {
    // vitest arranca en la raíz del paquete; jsdom no da un import.meta.url de tipo file.
    const raiz = join(process.cwd(), 'hooks');
    const enDisco = readdirSync(raiz, { withFileTypes: true })
      .filter(entrada => entrada.isDirectory() && existsSync(join(raiz, entrada.name, 'index.ts')))
      .map(entrada => entrada.name)
      .sort();
    expect(Object.keys(BARRILES).sort()).toEqual(enDisco);
  });

  it('los tramos reparten exactamente los barriles del contrato, sin repetir', () => {
    // Si alguien añade un barril sin asignarlo a un tramo (o lo duplica), falla aquí.
    expect(Object.values(TRAMOS).flat().sort()).toEqual(Object.keys(BARRILES).sort());
  });
});

describe('contrato público de los barriles de hooks: cuentas', () => {
  it.each(barrilesDelTramo(TRAMOS.cuentas))(
    '%s expone exactamente su contrato público',
    async (dominio, contrato) => {
      await verificarContrato(dominio, contrato);
    }
  );
});
