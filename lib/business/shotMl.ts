/**
 * Ml por shot efectivos de un producto: si define los suyos (`productos.ml_shot`) se usan
 * esos; sin valor propio se cae al `shot_ml` global de Configuraciones.
 */
export function resolveShotMl(mlShot: number | null | undefined, globalShotMl: number): number {
  return Number(mlShot ?? 0) > 0 ? Number(mlShot) : globalShotMl;
}

/**
 * Ml por shot cuando lo pide una anfitriona: si el producto define los suyos
 * (`productos.ml_shot_anfitriona`) se usan esos; sin valor propio se sirve el mismo
 * volumen que a un cliente (`mlCliente`, ya resuelto).
 */
export function resolveShotMlAnfitriona(
  mlShotAnfitriona: number | null | undefined,
  mlCliente: number
): number {
  return Number(mlShotAnfitriona ?? 0) > 0 ? Number(mlShotAnfitriona) : mlCliente;
}

/** Unidades de volumen que aparecen en el nombre de una presentación, con su factor a ml. */
const FACTOR_UNIDAD_ML: Record<string, number> = {
  ml: 1,
  mililitro: 1,
  mililitros: 1,
  l: 1000,
  litro: 1000,
  litros: 1000
};

/**
 * Capacidad en ml que declara el nombre de una presentación (`1000 ml`, `750ml`, `1 litro`).
 * Las presentaciones se nombran por su formato, así que su nombre dice la capacidad que la
 * columna `ml_botella` todavía no tiene. `null` cuando el nombre no declara un volumen
 * (`Botella chica`, `750`), para que el llamador decida el default.
 */
export function mlDesdeNombrePresentacion(nombre?: string | null): number | null {
  const texto = (nombre ?? '').trim();
  if (!texto) return null;
  const encontrado = texto.match(/(\d+(?:[.,]\d+)?)\s*(ml|mililitros?|litros?|l)\b/i);
  if (!encontrado) return null;
  const cantidad = Number(encontrado[1].replace(',', '.'));
  const factor = FACTOR_UNIDAD_ML[encontrado[2].toLowerCase()] ?? 1;
  const ml = Math.round(cantidad * factor);
  return ml > 0 ? ml : null;
}

/**
 * Capacidad de la botella con la que se descuenta el contenido de una presentación: la que
 * define la propia (`ml_botella`), si no la que declara su nombre y, en último caso, la de
 * Configuraciones (`botella_ml`).
 *
 * Sin el paso por el nombre, una presentación llamada "1000 ml" sin `ml_botella` guardada se
 * abriría como una botella de 750 ml: el primer shot descontaría 50 ml de 750 y el bar
 * mostraría 700 ml de algo que nunca se sirvió.
 */
export function resolveBotellaMl(
  mlBotella: number | null | undefined,
  nombrePresentacion: string | null | undefined,
  globalBotellaMl: number
): number {
  const propia = Math.floor(Number(mlBotella ?? 0));
  if (propia > 0) return propia;
  return mlDesdeNombrePresentacion(nombrePresentacion) ?? globalBotellaMl;
}
