import * as infraestructura from './infraestructura';

export function revertirStockAnulacion(
  ...args: Parameters<typeof infraestructura.revertirStockAnulacion>
) {
  return infraestructura.revertirStockAnulacion(...args);
}
