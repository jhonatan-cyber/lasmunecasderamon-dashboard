/** Ml por shot efectivos de un producto; sin valor propio se usa Configuraciones. */
export function resolveShotMl(mlShot: number | null | undefined, globalShotMl: number): number {
  return Number(mlShot ?? 0) > 0 ? Number(mlShot) : globalShotMl;
}

/** Sin volumen de anfitriona, usa el volumen de cliente ya resuelto. */
export function resolveShotMlAnfitriona(
  mlShotAnfitriona: number | null | undefined,
  mlCliente: number
): number {
  return Number(mlShotAnfitriona ?? 0) > 0 ? Number(mlShotAnfitriona) : mlCliente;
}

const FACTOR_UNIDAD_ML: Record<string, number> = {
  ml: 1,
  mililitro: 1,
  mililitros: 1,
  l: 1000,
  litro: 1000,
  litros: 1000
};

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

export function resolveBotellaMl(
  mlBotella: number | null | undefined,
  nombrePresentacion: string | null | undefined,
  globalBotellaMl: number
): number {
  const propia = Math.floor(Number(mlBotella ?? 0));
  if (propia > 0) return propia;
  return mlDesdeNombrePresentacion(nombrePresentacion) ?? globalBotellaMl;
}
