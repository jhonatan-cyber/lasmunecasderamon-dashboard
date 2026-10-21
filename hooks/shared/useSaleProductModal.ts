'use client';

import { matchesProductSearch } from '@/lib/utils/productSearch';
import { useEffect, useState } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import { useConfigValue } from '@/hooks/shared/useConfigValue';
import { getActiveHostesses } from '@/components/orders';
import {
  buildSaleProductItem,
  type SaleProductItem,
  type SaleProductItemContext
} from '@/components/sales/product-modal/saleProductItems';

export type SaleProductViewMode = 'table' | 'cards';

const ITEMS_PER_PAGE = 5;

export interface UseSaleProductModalOptions {
  open: boolean;
  productos: any[];
  cantidades: { [key: string]: number };
  handleCantidadChange: (id: string, value: string) => void;
  handleAgregarProducto: (producto: any) => void;
  anfitrionas: any[];
  champagneHostessSelections: { [key: string]: string[] };
  onChampagneHostessChange: (productId: string, hostessIds: string[]) => void;
  otherProductHostessSelections: { [key: string]: string[] };
  onOtherProductHostessChange: (productId: string, hostessIds: string[]) => void;
  productosEnCarrito: any[];
}

export interface SaleProductModalState {
  viewMode: SaleProductViewMode;
  setViewMode: Dispatch<SetStateAction<SaleProductViewMode>>;
  query: string;
  queryNorm: string;
  handleQueryChange: (value: string) => void;
  clearQuery: () => void;
  currentPage: number;
  setCurrentPage: Dispatch<SetStateAction<number>>;
  totalPages: number;
  filteredCount: number;
  availableHostesses: any[];
  items: SaleProductItem[];
  selectedItems: SaleProductItem[];
  resetSelection: () => void;
}

export function useSaleProductModal({
  open,
  productos,
  cantidades,
  handleCantidadChange,
  handleAgregarProducto,
  anfitrionas,
  champagneHostessSelections,
  onChampagneHostessChange,
  otherProductHostessSelections,
  onOtherProductHostessChange,
  productosEnCarrito
}: UseSaleProductModalOptions): SaleProductModalState {
  const [viewMode, setViewMode] = useState<SaleProductViewMode>('table');
  const [currentPage, setCurrentPage] = useState(1);
  const [query, setQuery] = useState('');
  const [hostessSearchValues, setHostessSearchValues] = useState<{ [key: string]: string }>({});
  const [cantidadesPorTipo, setCantidadesPorTipo] = useState<{ [key: string]: number }>({});
  const [mixers, setMixers] = useState<Record<string, any>>({});
  const [bar, setBar] = useState<any[]>([]);
  const [mixerLoading, setMixerLoading] = useState(false);
  const [mixerError, setMixerError] = useState('');
  const [mixerReload, setMixerReload] = useState(0);
  const shotMl = useConfigValue<number>('bar', 'shot_ml', 50);

  useEffect(() => {
    if (!open) return;
    const controller = new AbortController();
    setMixerLoading(true);
    setMixerError('');
    fetch('/api/bar?acompanamientos=1', { cache: 'no-store', signal: controller.signal })
      .then(async response => {
        const result = await response.json();
        if (!response.ok || !result.success || !Array.isArray(result.data)) throw new Error();
        if (!controller.signal.aborted) setBar(result.data);
      })
      .catch(() => {
        if (!controller.signal.aborted) setMixerError('No se pudieron cargar las bebidas');
      })
      .finally(() => {
        if (!controller.signal.aborted) setMixerLoading(false);
      });
    return () => controller.abort();
  }, [open, mixerReload]);

  useEffect(() => {
    setCurrentPage(1);
    setQuery('');
    if (open && productos.some(product => product.modalCantidades)) {
      setCantidadesPorTipo(
        Object.fromEntries(
          productos.flatMap(product =>
            Object.entries(product.modalCantidades ?? {}).map(([format, cantidad]) => [
              `${product.id || product.id_producto}:${format}`,
              Number(cantidad)
            ])
          )
        )
      );
    }
  }, [open, productos]);

  const availableHostesses = getActiveHostesses(anfitrionas || []);

  const queryNorm = query.trim().toLowerCase();
  const filteredProductos = queryNorm
    ? (productos || []).filter(p => matchesProductSearch(p, queryNorm))
    : productos || [];
  const totalPages = Math.ceil((filteredProductos?.length || 0) / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const currentProductos = filteredProductos?.slice(startIndex, startIndex + ITEMS_PER_PAGE) || [];

  const context: SaleProductItemContext = {
    mixers,
    bar,
    mixerLoading,
    mixerError,
    onMixerChange: (key, value) => setMixers(prev => ({ ...prev, [key]: value })),
    onMixerRetry: () => setMixerReload(value => value + 1),
    shotMl,
    cantidades,
    cantidadesPorTipo,
    champagneHostessSelections,
    otherProductHostessSelections,
    hostessSearchValues,
    productosEnCarrito,
    availableHostesses,
    onSaleTypeChange: (id, value, cantidad) =>
      setCantidadesPorTipo(prev => ({ ...prev, [`${id}:${value}`]: cantidad })),
    onCantidadChange: handleCantidadChange,
    onChampagneHostessChange,
    onOtherProductHostessChange,
    onHostessSearchChange: (id, value) =>
      setHostessSearchValues(prev => ({ ...prev, [id]: value })),
    onAgregarProducto: handleAgregarProducto
  };

  return {
    resetSelection: () => {
      setCantidadesPorTipo({});
      setMixers({});
      setHostessSearchValues({});
      setQuery('');
      setCurrentPage(1);
      Object.keys(cantidades).forEach(id => handleCantidadChange(id, '0'));
      Object.keys(champagneHostessSelections).forEach(id => onChampagneHostessChange(id, []));
      Object.keys(otherProductHostessSelections).forEach(id => onOtherProductHostessChange(id, []));
    },
    viewMode,
    setViewMode,
    query,
    queryNorm,
    handleQueryChange: value => {
      setQuery(value);
      setCurrentPage(1);
    },
    clearQuery: () => setQuery(''),
    currentPage,
    setCurrentPage,
    totalPages,
    filteredCount: filteredProductos?.length || 0,
    availableHostesses,
    selectedItems: productos
      .map(p => buildSaleProductItem(p, context))
      .filter(item => item.cantidadActual > 0),
    items: currentProductos.map(p => buildSaleProductItem(p, context))
  };
}
