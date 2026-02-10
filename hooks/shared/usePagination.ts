import { useState, useMemo } from 'react';

export interface PaginationConfig {
  itemsPerPage: number;
  maxVisiblePages?: number;
}

export interface PaginationState {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage: number;
  startIndex: number;
  endIndex: number;
}

export interface PaginationControls {
  goToPage: (page: number) => void;
  nextPage: () => void;
  previousPage: () => void;
  goToFirstPage: () => void;
  goToLastPage: () => void;
  setItemsPerPage: (itemsPerPage: number) => void;
}

export interface UsePaginationReturn<T> {
  paginatedData: T[];
  pagination: PaginationState;
  controls: PaginationControls;
  visiblePages: number[];
}

export function usePagination<T>(
  data: T[],
  config: PaginationConfig = { itemsPerPage: 10, maxVisiblePages: 5 }
): UsePaginationReturn<T> {
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(config.itemsPerPage);

  const pagination = useMemo((): PaginationState => {
    const totalItems = data.length;
    const totalPages = Math.ceil(totalItems / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = Math.min(startIndex + itemsPerPage, totalItems);

    return {
      currentPage,
      totalPages,
      totalItems,
      itemsPerPage,
      startIndex,
      endIndex
    };
  }, [data.length, currentPage, itemsPerPage]);

  const paginatedData = useMemo(() => {
    return data.slice(pagination.startIndex, pagination.endIndex);
  }, [data, pagination.startIndex, pagination.endIndex]);

  const visiblePages = useMemo(() => {
    const { currentPage, totalPages } = pagination;
    const maxVisiblePages = config.maxVisiblePages || 5;
    
    if (totalPages <= maxVisiblePages) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }

    const halfVisible = Math.floor(maxVisiblePages / 2);
    let startPage = Math.max(1, currentPage - halfVisible);
    let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);

    if (endPage - startPage + 1 < maxVisiblePages) {
      startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }

    return Array.from(
      { length: endPage - startPage + 1 },
      (_, i) => startPage + i
    );
  }, [pagination.currentPage, pagination.totalPages, config.maxVisiblePages]);

  const controls: PaginationControls = {
    goToPage: (page: number) => {
      if (page >= 1 && page <= pagination.totalPages) {
        setCurrentPage(page);
      }
    },
    nextPage: () => {
      if (currentPage < pagination.totalPages) {
        setCurrentPage(currentPage + 1);
      }
    },
    previousPage: () => {
      if (currentPage > 1) {
        setCurrentPage(currentPage - 1);
      }
    },
    goToFirstPage: () => {
      setCurrentPage(1);
    },
    goToLastPage: () => {
      setCurrentPage(pagination.totalPages);
    },
    setItemsPerPage: (newItemsPerPage: number) => {
      setItemsPerPage(newItemsPerPage);
      setCurrentPage(1); // Reset to first page when changing items per page
    }
  };

  return {
    paginatedData,
    pagination,
    controls,
    visiblePages
  };
}

export default usePagination; 