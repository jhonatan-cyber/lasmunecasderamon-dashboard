import { useState, useEffect } from 'react';
import logger from '@/lib/utils/logger';

interface SearchResult {
  id_producto?: string;
  id?: string;
  nombre?: string;
  name?: string;
  [key: string]: any;
}

export function useProductSearch(debounceMs: number = 300) {
  const [internalSearchTerm, setInternalSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  
  useEffect(() => {
    const searchProducts = async () => {
      if (!internalSearchTerm.trim()) {
        setSearchResults([]);
        setCurrentPage(1);
        return;
      }

      setSearchLoading(true);
      try {
        const res = await fetch(`/api/products?term=${encodeURIComponent(internalSearchTerm)}`);
        if (!res.ok) {
          throw new Error(`HTTP error! status: ${res.status}`);
        }
        const data = await res.json();
        setSearchResults(data.success ? data.data : []);
        setCurrentPage(1); 
      } catch (error) {
        logger.captureException(error, { context: 'ProductSearch:searchProducts' });
        setSearchResults([]);
      } finally {
        setSearchLoading(false);
      }
    };

    const timeoutId = setTimeout(searchProducts, debounceMs);
    return () => clearTimeout(timeoutId);
  }, [internalSearchTerm, debounceMs]);

  
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedResults = searchResults.slice(startIndex, startIndex + itemsPerPage);
  const totalPages = Math.ceil(searchResults.length / itemsPerPage);

  const handleSearchChange = (value: string) => {
    setInternalSearchTerm(value);
    setCurrentPage(1);
  };

  const handleClearSearch = () => {
    setInternalSearchTerm('');
    setSearchResults([]);
    setSearchLoading(false);
    setCurrentPage(1);
  };

  const goToPage = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  return {
    
    internalSearchTerm,
    searchResults,
    searchLoading,
    paginatedResults,
    currentPage,
    totalPages,
    itemsPerPage,

    
    setInternalSearchTerm: handleSearchChange,

    
    handleSearchChange,
    handleClearSearch,
    goToPage
  };
}
