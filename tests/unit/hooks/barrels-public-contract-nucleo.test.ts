import { describe, it } from 'vitest';
import { TRAMOS, barrilesDelTramo, verificarContrato } from './contrato-barriles';

/**
 * Contrato público de los barriles de hooks, tramo `núcleo`: servicios,
 * utilidades compartidas y personal. El mapa completo vive en
 * `./contrato-barriles`; el reparto por archivo mantiene el tiempo de cada
 * archivo muy por debajo del presupuesto de 30 s (ver `DurationBudgetReporter`).
 */
describe('contrato público de los barriles de hooks: núcleo', () => {
  it.each(barrilesDelTramo(TRAMOS.nucleo))(
    '%s expone exactamente su contrato público',
    async (dominio, contrato) => {
      await verificarContrato(dominio, contrato);
    }
  );
});
