import { useState, useCallback, useMemo } from 'react';

interface UseProductSelectionParams {
  productos: any[];
  cantidades: { [key: string]: number };
  onCantidadChange: (id: string, value: string) => void;
  onAgregarProducto: (producto: any) => void;
}

/**
 * Hook para manejar la selección de productos en modales
 * Consolida la lógica de selección múltiple y agregado en lote
 */
export function useProductSelection({
  productos,
  cantidades,
  onCantidadChange,
  onAgregarProducto
}: UseProductSelectionParams) {
  const [selectedProducts, setSelectedProducts] = useState<{[key: string]: number}>({});

  const handleAddToSelection = useCallback((producto: any) => {
    const id = producto.id_producto || producto.id;
    const cantidad = cantidades[id] || 1;
    setSelectedProducts(prev => ({
      ...prev,
      [id]: cantidad
    }));
  }, [cantidades]);

  const handleRemoveFromSelection = useCallback((id: string) => {
    setSelectedProducts(prev => {
      const newSelection = { ...prev };
      delete newSelection[id];
      return newSelection;
    });
  }, []);

  const handleAddAllSelected = useCallback(() => {
    Object.entries(selectedProducts).forEach(([id, cantidad]) => {
      const producto = productos?.find(p => (p.id_producto || p.id).toString() === id);
      if (producto) {
        onCantidadChange(id, cantidad.toString());
        onAgregarProducto(producto);
      }
    });
    setSelectedProducts({});
  }, [selectedProducts, productos, onCantidadChange, onAgregarProducto]);

  const clearSelection = useCallback(() => {
    setSelectedProducts({});
  }, []);

  const totalSelected = useMemo(() => {
    return Object.values(selectedProducts).reduce((sum, cantidad) => sum + cantidad, 0);
  }, [selectedProducts]);

  const totalValue = useMemo(() => {
    return Object.entries(selectedProducts).reduce((sum, [id, cantidad]) => {
      const producto = productos?.find(p => (p.id_producto || p.id).toString() === id);
      if (producto) {
        return sum + (producto.precio || producto.price || 0) * cantidad;
      }
      return sum;
    }, 0);
  }, [selectedProducts, productos]);

  return {
    selectedProducts,
    handleAddToSelection,
    handleRemoveFromSelection,
    handleAddAllSelected,
    clearSelection,
    totalSelected,
    totalValue
  };
}
