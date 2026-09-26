/**
 * Ml por shot efectivos de un producto: si define los suyos (`productos.ml_shot`) se usan
 * esos; sin valor propio se cae al `shot_ml` global de Configuraciones.
 */
export function resolveShotMl(mlShot: number | null | undefined, globalShotMl: number): number {
  return Number(mlShot ?? 0) > 0 ? Number(mlShot) : globalShotMl;
}
