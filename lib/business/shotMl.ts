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
