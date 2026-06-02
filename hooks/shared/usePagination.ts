'use client';

/* eslint-disable */
import { useState, useMemo, useCallback, useEffect } from 'react';

const DEFAULT_CONFIG: PaginationConfig = {
  itemsPerPage: 10,
  maxVisiblePages: 5
};

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
  config: PaginationConfig = DEFAULT_CONFIG
): UsePaginationReturn<T> {
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(config.itemsPerPage);
  const maxVisiblePages = config.maxVisiblePages ?? DEFAULT_CONFIG.maxVisiblePages ?? 5;

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

  useEffect(() => {
    const lastPage = Math.max(pagination.totalPages, 1);
    if (currentPage > lastPage) {
      setCurrentPage(lastPage);
    }
  }, [currentPage, pagination.totalPages]);

  const paginatedData = useMemo(() => {
    return data.slice(pagination.startIndex, pagination.endIndex);
  }, [data, pagination.startIndex, pagination.endIndex]);

  const visiblePages = useMemo(() => {
    const { currentPage, totalPages } = pagination;

    if (totalPages <= maxVisiblePages) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }

    const halfVisible = Math.floor(maxVisiblePages / 2);
    let startPage = Math.max(1, currentPage - halfVisible);
    let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);

    if (endPage - startPage + 1 < maxVisiblePages) {
      startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }

    return Array.from({ length: endPage - startPage + 1 }, (_, i) => startPage + i);
  }, [pagination.currentPage, pagination.totalPages, maxVisiblePages]);

  const goToPage = useCallback(
    (page: number) => {
      if (page >= 1 && page <= pagination.totalPages) {
        setCurrentPage(page);
      }
    },
    [pagination.totalPages]
  );

  const nextPage = useCallback(() => {
    setCurrentPage(prev => Math.min(prev + 1, pagination.totalPages));
  }, [pagination.totalPages]);

  const previousPage = useCallback(() => {
    setCurrentPage(prev => Math.max(prev - 1, 1));
  }, []);

  const goToFirstPage = useCallback(() => {
    setCurrentPage(1);
  }, []);

  const goToLastPage = useCallback(() => {
    setCurrentPage(pagination.totalPages || 1);
  }, [pagination.totalPages]);

  const updateItemsPerPage = useCallback((newItemsPerPage: number) => {
    setItemsPerPage(newItemsPerPage);
    setCurrentPage(1);
  }, []);

  const controls: PaginationControls = useMemo(
    () => ({
      goToPage,
      nextPage,
      previousPage,
      goToFirstPage,
      goToLastPage,
      setItemsPerPage: updateItemsPerPage
    }),
    [goToPage, nextPage, previousPage, goToFirstPage, goToLastPage, updateItemsPerPage]
  );

  return {
    paginatedData,
    pagination,
    controls,
    visiblePages
  };
}

export default usePagination;
