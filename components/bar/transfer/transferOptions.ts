import type { SaleOption, SaleType } from '@/types/sale-options';

/**
 * Helpers y tipos puros del traspaso de bar. Extraídos de `TransferModal.tsx`
 * (802 líneas) para que el modal quede como composición y para poder importar
 * `parseSavedOptions` / `BarStockItem` sin arrastrar el componente completo.
 */

export const esChampagne = (categoria?: string | null) =>
  /champan|champagne/.test((categoria || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase());

export const formatMiles = (v: string | number) =>
  String(v ?? '')
    .replace(/\D/g, '')
    .replace(/\B(?=(\d{3})+(?!\d))/g, '.');

export const formatNumber = (value: string) =>
  value.replace(/\D/g, '').replace(/\B(?=(\d{3})+(?!\d))/g, '.');

export function parseSavedOptions(raw: unknown): SaleOption[] | undefined {
  if (raw === undefined || raw === null) return undefined;
  if (typeof raw === 'string') {
    const trimmed = raw.trim();
    if (!trimmed) return undefined;
    try {
      const parsed = JSON.parse(trimmed);
      return parseSavedOptions(parsed);
    } catch {
      return undefined;
    }
  }
  if (Array.isArray(raw)) {
    const options = (raw as any[])
      .filter(o => o && typeof o.tipo === 'string')
      .map(o => {
        const option: SaleOption = {
          tipo: o.tipo as SaleType,
          precio: Number(o.precio ?? 0),
          comision: Number(o.comision ?? 0)
        };
        if (option.tipo === 'shot') {
          option.ml_acompanamiento_cliente =
            o.ml_acompanamiento_cliente === undefined
              ? undefined
              : Number(o.ml_acompanamiento_cliente);
          option.ml_acompanamiento_anfitriona =
            o.ml_acompanamiento_anfitriona === undefined
              ? undefined
              : Number(o.ml_acompanamiento_anfitriona);
        }
        if (option.tipo === 'botella' && Number(o.precio_sin_anfitriona) > 0)
          option.precio_sin_anfitriona = Number(o.precio_sin_anfitriona);
        if (option.tipo === 'botella' && typeof o.colacion_habilitada === 'boolean')
          option.colacion_habilitada = o.colacion_habilitada;
        if (option.tipo === 'botella' && typeof o.cover_habilitado === 'boolean')
          option.cover_habilitado = o.cover_habilitado;
        // Precio independiente para anfitrionas; no hereda el precio de cliente.
        const anfitriona = Number(o.precio_anfitriona ?? 0);
        if (option.tipo === 'shot' && Number.isFinite(anfitriona) && anfitriona > 0) {
          option.precio_anfitriona = anfitriona;
        }
        if (option.tipo === 'shot' && Array.isArray(o.precios_anfitriona)) {
          option.precios_anfitriona = o.precios_anfitriona.map((row: any) => ({
            precio: Number(row.precio),
            comision: Number(row.comision ?? 0)
          }));
        }
        if (
          option.tipo === 'botella' &&
          o.acompanamiento &&
          (o.acompanamiento.tipo === undefined ||
            ['gaseosa', 'soda'].includes(o.acompanamiento.tipo)) &&
          Number.isInteger(Number(o.acompanamiento.unidades)) &&
          Number(o.acompanamiento.unidades) >= 0 &&
          Number(o.acompanamiento.unidades) <= 1000
        ) {
          option.acompanamiento = {
            tipo: o.acompanamiento.tipo,
            unidades: Number(o.acompanamiento.unidades)
          };
        }
        return option;
      });
    return options.length > 0 ? options : undefined;
  }
  return undefined;
}

export interface BarStockItem {
  opciones_venta?: SaleOption[] | string;
  id: string;
  producto_id: string;
  producto_nombre: string;
  producto_codigo: string;
  producto_foto: string | null;
  categoria_nombre?: string | null;
  nombre: string;
  codigo_barras: string | null;
  precio_compra: number;
  precio_venta: number;
  comision: number;
  foto: string | null;
  stock: number;
  stock_bar?: number;
  /** Botellas agotadas por shots que siguen en el bar pendientes de devolución. */
  botellas_vacias_shots?: number;
  botellas_abiertas?: Array<{
    id: string;
    codigo: string;
    codigo_barras: string | null;
    ml_restante: number;
  }>;
  botellas_por_devolver?: Array<{
    id: string;
    codigo: string;
    codigo_barras: string | null;
    ml_restante: number;
  }>;
  /** Capacidad de la botella en ml (null = default de Configuraciones > Bar). */
  ml_botella?: number | null;
  /** Ml servidos por shot de ese producto (null = default de Configuraciones > Bar). */
  ml_shot?: number | null;
  /** Ml servidos por shot a anfitriona (null = igual que a cliente). */
  ml_shot_anfitriona?: number | null;
  /** ml que quedan en la botella abierta de esa presentación en el bar. */
  ml_abierta?: number;
  /** Acumulado de ml servidos por shots en las ventas de esa presentación. */
  ml_servidos?: number;
  /** De Configuraciones > Comisiones. Null = default. */
  max_anfitrionas?: number | null;
  /** Base del producto, fallback si la presentación no tiene precio/comisión. */
  producto_precio?: number | null;
  producto_comision?: number | null;
}

export interface TransferModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: BarStockItem | null;
  onDone: () => void;
  endpoint?: string;
}

/** Fila de la tabla de precios champagne (anfitrionas / precio / comisión). */
export interface ChampagneTierRow {
  anfitrionas: number;
  precio: string;
  comision: string;
}
