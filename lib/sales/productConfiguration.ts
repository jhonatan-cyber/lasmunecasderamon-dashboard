import { parseSavedOptions } from '@/components/bar/transfer/transferOptions';
export function hostessMixerMl(product: any): number {
  return product.shot_anfitriona
    ? Number(
        (parseSavedOptions(product.opciones_venta) ?? []).find(
          (option: any) => option.tipo === 'shot'
        )?.ml_acompanamiento_anfitriona ?? 0
      )
    : 0;
}
export function shortMixerConsumption(
  product: any
): { unidades: number } | { ml_por_corto: number } {
  const ml = hostessMixerMl(product);
  return product.shot_anfitriona ? { ml_por_corto: ml } : { unidades: 1 };
}
export function requiresShortMixer(product: any): boolean {
  return product.tipo_venta === 'shot' && (!product.shot_anfitriona || hostessMixerMl(product) > 0);
}
export function bottleMixerUnits(product: any): number {
  const bottle = (parseSavedOptions(product.opciones_venta) ?? []).find(
    option => option.tipo === 'botella'
  );
  return Number(
    bottle ? (bottle.acompanamiento?.unidades ?? 0) : (product.unidades_acompanamiento ?? 0)
  );
}
