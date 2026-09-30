'use client';

import { useEffect, useState } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import { useConfigValue } from '@/hooks/shared/useConfigValue';
import { getActiveHostesses } from '@/components/orders';
import type { SaleChoice } from '@/lib/sales/saleChoice';
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
  /** Modelo de vista de la página actual (una entrada por presentación). */
  items: SaleProductItem[];
}

/**
 * Estado completo del modal de productos de la venta: vista tabla/tarjetas,
 * búsqueda con paginación, tipo de venta elegido por presentación, selección
 * de anfitrionas por producto y el modelo de vista (`items`) de la página
 * actual. El modal solo compone esto con los subcomponentes de
 * `components/sales/product-modal/`.
 */
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
  // Tipo de venta elegido por presentación: botella entera o shot (descuenta ml).
  const [tiposVenta, setTiposVenta] = useState<{ [key: string]: SaleChoice }>({});
  const shotMl = useConfigValue<number>('bar', 'shot_ml', 50);

  // Cambiar de categoría o reabrir reinicia la vista.
  useEffect(() => {
    setCurrentPage(1);
    setQuery('');
  }, [open, productos]);

  const availableHostesses = getActiveHostesses(anfitrionas || []);

  const queryNorm = query.trim().toLowerCase();
  const filteredProductos = queryNorm
    ? (productos || []).filter(p => `${p.nombre || p.name || ''}`.toLowerCase().includes(queryNorm))
    : productos || [];
  const totalPages = Math.ceil((filteredProductos?.length || 0) / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const currentProductos = filteredProductos?.slice(startIndex, startIndex + ITEMS_PER_PAGE) || [];

  const context: SaleProductItemContext = {
    shotMl,
    cantidades,
    tiposVenta,
    champagneHostessSelections,
    otherProductHostessSelections,
    hostessSearchValues,
    productosEnCarrito,
    availableHostesses,
    onSaleTypeChange: (id, value) => setTiposVenta(prev => ({ ...prev, [id]: value })),
    onCantidadChange: handleCantidadChange,
    onChampagneHostessChange,
    onOtherProductHostessChange,
    onHostessSearchChange: (id, value) =>
      setHostessSearchValues(prev => ({ ...prev, [id]: value })),
    onAgregarProducto: handleAgregarProducto
  };

  return {
    viewMode,
    setViewMode,
    query,
    queryNorm,
    handleQueryChange: value => {
      setQuery(value);
      setCurrentPage(1);
    },
    // La X solo limpia el texto: la página en la que esté se conserva.
    clearQuery: () => setQuery(''),
    currentPage,
    setCurrentPage,
    totalPages,
    filteredCount: filteredProductos?.length || 0,
    availableHostesses,
    items: currentProductos.map(p => buildSaleProductItem(p, context))
  };
}
