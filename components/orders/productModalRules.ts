export type ProductLike = {
  categoria?: string;
  category_name?: string;
  comision?: number;
  commission?: number;
  precio?: number;
  price?: number;
  max_anfitrionas?: number | null;
};

export type HostessLike = {
  estado?: number;
  status?: number;
  id?: string | number;
  id_usuario?: string | number;
};

export type SelectedHostessSource = {
  selectedHostesses?: (number | null)[] | null;
};

const normalizeText = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();

export const isChampagneProduct = (producto: ProductLike) => {
  const categoria = normalizeText(String(producto.categoria || producto.category_name || ''));
  return (
    categoria.includes('champagne') ||
    categoria.includes('champana') ||
    categoria.includes('shampana')
  );
};

export const hasCommission = (producto: ProductLike) =>
  Number(producto.comision || producto.commission || 0) > 0;

export type ServiceLevelConfig = {
  hostessDesde: number;
  habitacionDesde: number;
  /** Venta simple: hasta este precio no hay comisión ni anfitriona. Editable en Ajustes. */
  simpleHasta: number;
};

/** Valor por defecto de `simpleHasta` (clave `umbral_simple_hasta`). */
export const PRECIO_TOPE_SIMPLE = 10000;

export const DEFAULT_SERVICE_LEVELS: ServiceLevelConfig = {
  hostessDesde: 20000,
  habitacionDesde: 30000,
  simpleHasta: PRECIO_TOPE_SIMPLE
};

export const isSimpleProduct = (precio: number | string | null | undefined) => {
  const monto = Number(precio ?? 0);
  return Number.isFinite(monto) && monto <= serviceLevels.simpleHasta;
};

let serviceLevels: ServiceLevelConfig = { ...DEFAULT_SERVICE_LEVELS };

const cleanLevel = (v: unknown, fallback: number) => {
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 ? Math.floor(n) : fallback;
};

/** Merge: solo pisa los campos provistos, el resto se conserva. */
export const setServiceLevels = (parcial?: Partial<ServiceLevelConfig> | null) => {
  if (!parcial) return;
  serviceLevels = {
    hostessDesde:
      parcial.hostessDesde === undefined
        ? serviceLevels.hostessDesde
        : cleanLevel(parcial.hostessDesde, serviceLevels.hostessDesde),
    habitacionDesde:
      parcial.habitacionDesde === undefined
        ? serviceLevels.habitacionDesde
        : cleanLevel(parcial.habitacionDesde, serviceLevels.habitacionDesde),
    simpleHasta:
      parcial.simpleHasta === undefined
        ? serviceLevels.simpleHasta
        : cleanLevel(parcial.simpleHasta, serviceLevels.simpleHasta)
  };
};

export const getServiceLevels = (): ServiceLevelConfig => ({ ...serviceLevels });

/** Nivel por precio: simple hasta simpleHasta, anfitriona desde hostessDesde, + habitación desde habitacionDesde. */
export const serviceLevelForPrice = (precio: number | string | null | undefined) => {
  const monto = Number(precio ?? 0);
  if (!Number.isFinite(monto) || monto <= serviceLevels.simpleHasta) return 'ninguno' as const;
  if (monto < serviceLevels.hostessDesde) return 'ninguno' as const;
  if (monto < serviceLevels.habitacionDesde) return 'anfitriona' as const;
  return 'anfitriona+habitacion' as const;
};

export const hostessAllowedForPrice = (precio: number | string | null | undefined) =>
  serviceLevelForPrice(precio) !== 'ninguno';

export const roomRequiredForPrice = (precio: number | string | null | undefined) =>
  serviceLevelForPrice(precio) === 'anfitriona+habitacion';

/**
 * Unificado: "producto caro" == nivel que exige habitación.
 * Se mantiene por compatibilidad con callers existentes.
 * Antes usaba `threshold_producto_caro` (duplicado de `umbral_habitacion_desde`).
 */
export const isExpensiveDrink = (producto: ProductLike) =>
  roomRequiredForPrice(Number(producto.precio ?? producto.price ?? 0));

/** @deprecated Usá `setServiceLevels({ habitacionDesde })` en su lugar */
export const setExpensiveDrinkThreshold = (v: number) => {
  setServiceLevels({ habitacionDesde: Number(v) });
};

/** @deprecated Usá `getServiceLevels().habitacionDesde` en su lugar */
export const expensiveDrinkThreshold = 30000;

export let cardSplitVenta = 0.51;
export let cardSplitPropina = 0.49;

const roundToThousand = (monto: number) => Math.round(monto / 1000) * 1000;

export const setCardSplit = (ventaPct: number, propinaPct: number) => {
  cardSplitVenta = ventaPct;
  cardSplitPropina = propinaPct;
};

export const getCardSplit = (total: number) => {
  const venta = roundToThousand(total * cardSplitVenta);
  const propina = roundToThousand(Math.max(0, total * cardSplitPropina));
  return { venta, propina };
};

/**
 * Fallback síncrono para champagne cuando no hay tiers de BD a mano.
 * Derivado de la tabla canónica (ver `lib/business/champagne.ts`):
 * 1-2 → 120k, 3 → 160k, 4 → 180k, 5 → 200k.
 * Prioridad real: `max_anfitrionas` explícito > tiers por producto (API) > este fallback.
 */
const getChampagneTierLimit = (precio: number) => {
  if (precio >= 200000) return 5;
  if (precio >= 180000) return 4;
  if (precio >= 160000) return 3;
  if (precio >= 120000) return 2;
  return 1;
};

export const getHostessLimit = (producto: ProductLike) => {
  const max = producto.max_anfitrionas;
  if (max !== null && max !== undefined && Number(max) > 0) return Math.floor(Number(max));
  const precio = Number(producto.precio || producto.price || 0);
  return isChampagneProduct(producto) ? getChampagneTierLimit(precio) : 1;
};

/** @deprecated Usá `getHostessLimit` en su lugar */
export const getChampagneHostessLimit = getHostessLimit;

export const getActiveHostesses = <T extends HostessLike>(hostesses: T[]) =>
  hostesses.filter(h => {
    const estado = h.estado || h.status;
    return estado === 1 || estado === 2;
  });

export const getAssignedHostessIds = (sources: {
  champagneSelections?: Record<string, string[]>;
  otherSelections?: Record<string, string[]>;
  cartProducts?: SelectedHostessSource[];
}) => {
  const champagneAssigned = Object.values(sources.champagneSelections || {}).flat();
  const otherProductsAssigned = Object.values(sources.otherSelections || {}).flat();
  const carritoAssigned = (sources.cartProducts || []).flatMap(producto => {
    if (producto.selectedHostesses && Array.isArray(producto.selectedHostesses)) {
      return producto.selectedHostesses;
    }
    return [];
  });
  return [...champagneAssigned, ...otherProductsAssigned, ...carritoAssigned].filter(
    (id): id is number => id !== null
  );
};

export const computeOrderHostessLimit = (items: any[]) => {
  const champagneProducts = items.filter(isChampagneProduct);
  const otherCommissionProducts = items.filter(
    p =>
      !isChampagneProduct(p) && (Number(p.genera_comision) === 1 || Number(p.generaComision) === 1)
  );

  const otherCommissionQuantity = otherCommissionProducts.reduce(
    (sum, p) => sum + (Number(p.cantidad) || 1),
    0
  );

  let champagneLimit = 0;
  let maxChampagnePrice = 0;

  if (champagneProducts.length > 0) {
    maxChampagnePrice = Math.max(...champagneProducts.map(p => Number(p.precio || p.price || 0)));
    const maxChampagneProduct = champagneProducts.find(
      p => Number(p.precio || p.price || 0) === maxChampagnePrice
    );
    champagneLimit = getHostessLimit(maxChampagneProduct || champagneProducts[0]);
  }

  const maxAnfitrionas =
    champagneProducts.length > 0
      ? champagneLimit + otherCommissionQuantity
      : otherCommissionQuantity;

  return {
    maxAnfitrionas,
    champagneLimit,
    otherCommissionQuantity,
    hasChampagneProducts: champagneProducts.length > 0,
    maxChampagnePrice
  };
};
