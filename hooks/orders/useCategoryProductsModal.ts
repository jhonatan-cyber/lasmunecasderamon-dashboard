'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useDebounce } from 'use-debounce';
import logger from '@/lib/utils/logger';
import { useRefreshOnFocus } from '@/hooks/shared';
import {
  getActiveHostesses,
  getAssignedHostessIds,
  hasCommission,
  isChampagneProduct,
  isExpensiveDrink
} from '@/components/orders/productModalRules';

interface UseCategoryProductsModalProps {
  open: boolean;
  loading: boolean;
  productosCategoria: any[];
  anfitrionas: any[];
  champagneHostessSelections: { [key: string]: string[] };
  otherProductHostessSelections: { [key: string]: string[] };
  productosEnCarrito: any[];
  habitaciones?: any[];
  roomSelections?: { [key: string]: string };
}

export interface UseCategoryProductsModalReturn {
  // Pagination
  currentPage: number;
  setCurrentPage: (page: number) => void;
  currentProductos: any[];
  totalPages: number;

  // Hostess search
  hostessSearchValues: { [key: string]: string };
  debouncedSearchValues: { [key: string]: string };
  setHostessSearchValues: React.Dispatch<React.SetStateAction<{ [key: string]: string }>>;

  // Available hostesses
  anfitrionasDisponibles: any[];
  loadingAnfitrionas: boolean;
  availableHostesses: any[];

  // Computed
  getAllAssignedHostesses: (number | null)[];
  hasProductsWithCommission: boolean;

  // Methods
  requiresRoom: (producto: any) => boolean;
  getAvailableHostessesForChampagne: (currentProductId: string) => any[];
  getAvailableHostessesForOtherProducts: (currentProductId: string) => any[];
}

export function useCategoryProductsModal({
  open,
  loading: parentLoading,
  productosCategoria,
  anfitrionas,
  champagneHostessSelections,
  otherProductHostessSelections,
  productosEnCarrito,
  habitaciones = [],
  roomSelections = {}
}: UseCategoryProductsModalProps): UseCategoryProductsModalReturn {
  const [currentPage, setCurrentPage] = useState(1);
  const [hostessSearchValues, setHostessSearchValues] = useState<{ [key: string]: string }>({});
  const [anfitrionasDisponibles, setAnfitrionasDisponibles] = useState<any[]>([]);
  const [loadingAnfitrionas, setLoadingAnfitrionas] = useState(false);
  const [debouncedSearchValues] = useDebounce(hostessSearchValues, 300);

  const itemsPerPage = 5;

  useEffect(() => {
    setCurrentPage(1);
  }, [open, productosCategoria]);

  const refreshAvailableHostesses = useCallback(async () => {
    const hasAnyRoomSelected = Object.values(roomSelections).some(room => room && room !== '');

    if (!hasAnyRoomSelected) {
      setAnfitrionasDisponibles([]);
      return;
    }

    setLoadingAnfitrionas(true);
    try {
      const response = await fetch('/api/anfitrionas/disponibles');
      const data = await response.json();
      if (data.success) {
        setAnfitrionasDisponibles(data.data);
      }
    } catch (error) {
      logger.captureException(error, {
        context: 'CategoryProductsModal:fetchAnfitrionasDisponibles'
      });
    } finally {
      setLoadingAnfitrionas(false);
    }
  }, [roomSelections]);

  useEffect(() => {
    void refreshAvailableHostesses();
  }, [refreshAvailableHostesses]);

  useRefreshOnFocus(refreshAvailableHostesses, { enabled: open });

  const totalPages = Math.ceil((productosCategoria?.length || 0) / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentProductos = productosCategoria?.slice(startIndex, endIndex) || [];

  const requiresRoom = (producto: any) => {
    const tieneComision = hasCommission(producto);
    const hayHabitacionesDisponibles = habitaciones && habitaciones.length > 0;
    return isExpensiveDrink(producto) && tieneComision && hayHabitacionesDisponibles;
  };

  const availableHostesses = useMemo(() => getActiveHostesses(anfitrionas || []), [anfitrionas]);

  const getAllAssignedHostesses: (number | null)[] = useMemo(() => {
    return getAssignedHostessIds({
      champagneSelections: champagneHostessSelections,
      otherSelections: otherProductHostessSelections,
      cartProducts: productosEnCarrito
    });
  }, [champagneHostessSelections, otherProductHostessSelections, productosEnCarrito]);

  const getAvailableHostessesForChampagne = (currentProductId: string) => {
    const currentSelection = champagneHostessSelections[currentProductId] || [];
    const hasRoomSelected =
      roomSelections[currentProductId] && roomSelections[currentProductId] !== '';
    if (!hasRoomSelected) {
      return availableHostesses;
    }

    return availableHostesses.filter(h => {
      const hostessId = String(h.id || h.id_usuario);

      if (currentSelection.includes(hostessId)) {
        return true;
      }

      if (getAllAssignedHostesses.includes(Number(hostessId))) {
        return false;
      }

      return true;
    });
  };

  const getAvailableHostessesForOtherProducts = (currentProductId: string) => {
    const currentSelection = otherProductHostessSelections[currentProductId] || [];
    const hasRoomSelected =
      roomSelections[currentProductId] && roomSelections[currentProductId] !== '';

    if (!hasRoomSelected) {
      return availableHostesses;
    }

    return availableHostesses.filter(h => {
      const hostessId = String(h.id || h.id_usuario);

      if (currentSelection.includes(hostessId)) {
        return true;
      }

      if (getAllAssignedHostesses.includes(Number(hostessId))) {
        return false;
      }

      return true;
    });
  };

  const hasProductsWithCommission = useMemo(
    () => !parentLoading && productosCategoria?.some(p => hasCommission(p)),
    [parentLoading, productosCategoria]
  );

  return {
    currentPage,
    setCurrentPage,
    currentProductos,
    totalPages,
    hostessSearchValues,
    debouncedSearchValues,
    setHostessSearchValues,
    anfitrionasDisponibles,
    loadingAnfitrionas,
    availableHostesses,
    getAllAssignedHostesses,
    hasProductsWithCommission,
    requiresRoom,
    getAvailableHostessesForChampagne,
    getAvailableHostessesForOtherProducts
  };
}
