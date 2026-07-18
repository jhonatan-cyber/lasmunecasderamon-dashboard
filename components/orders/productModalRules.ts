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

export let expensiveDrinkThreshold = 30000;

export const setExpensiveDrinkThreshold = (v: number) => { expensiveDrinkThreshold = v; };

export const isExpensiveDrink = (producto: ProductLike) => {
  const precio = Number(producto.precio || producto.price || 0);
  return precio >= expensiveDrinkThreshold;
};

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

const getChampagneTierLimit = (precio: number) => {
  if (precio >= 240000) return 5;
  if (precio >= 200000) return 4;
  if (precio >= 140000) return 3;
  if (precio >= 120000) return 2;
  return 1;
};

export const getHostessLimit = (producto: ProductLike) => {
  const max = producto.max_anfitrionas;
  if (max !== null && max !== undefined && max > 0) return max;
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
  });    return [...champagneAssigned, ...otherProductsAssigned, ...carritoAssigned].filter(
    (id): id is number => id !== null
  );
};

export const computeOrderHostessLimit = (items: any[]) => {
  const champagneProducts = items.filter(isChampagneProduct);
  const otherCommissionProducts = items.filter(
    p => !isChampagneProduct(p) && (Number(p.genera_comision) === 1 || Number(p.generaComision) === 1)
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
    champagneProducts.length > 0 ? champagneLimit + otherCommissionQuantity : otherCommissionQuantity;

  return {
    maxAnfitrionas,
    champagneLimit,
    otherCommissionQuantity,
    hasChampagneProducts: champagneProducts.length > 0,
    maxChampagnePrice
  };
};
