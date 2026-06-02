export type ProductLike = {
  categoria?: string;
  category_name?: string;
  comision?: number;
  commission?: number;
  precio?: number;
  price?: number;
};

export type HostessLike = {
  estado?: number;
  status?: number;
  id?: string | number;
  id_usuario?: string | number;
};

export type SelectedHostessSource = {
  selectedHostesses?: (string | null)[] | null;
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

export const getChampagneHostessLimit = (producto: ProductLike) => {
  const precio = Number(producto.precio || producto.price || 0);
  if (precio >= 240000) return 5;
  if (precio >= 200000) return 4;
  if (precio >= 140000) return 3;
  if (precio >= 120000) return 2;
  return 1;
};

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

  return [...champagneAssigned, ...otherProductsAssigned, ...carritoAssigned];
};
