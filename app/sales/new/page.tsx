'use client';

import { useState, useMemo } from 'react';
import { useNewSaleForm } from '@/hooks/ventas/useNewSaleForm';
import { CajaStatusCheck } from '@/components/sales/CajaStatusCheck';
import CategoryCardList from '@/components/shared/CategoryCardList';
import SaleProductModal from '@/components/sales/SaleProductModal';

import { NewSaleHeader } from '@/components/sales/new/NewSaleHeader';
import { NewSaleSearch } from '@/components/sales/new/NewSaleSearch';
import { NewSaleConfiguration } from '@/components/sales/new/NewSaleConfiguration';
import { NewSaleCart } from '@/components/sales/new/NewSaleCart';
import { NewSaleSummary } from '@/components/sales/new/NewSaleSummary';
import { useMasterData, useRefreshOnFocus } from '@/hooks/shared';

export default function NewSale() {
  const {
    selectedCliente,
    setSelectedCliente,
    selectedHabitacion,
    metodoPago,
    setMetodoPago,
    productos,
    enableTip,
    setEnableTip,
    loading,
    searchProducto,
    setSearchProducto,
    manualTime,
    setManualTime,
    cantidades,
    setCantidades,
    champagneHostessSelections,
    setChampagneHostessSelections,
    otherProductHostessSelections,
    setOtherProductHostessSelections,
    hostessSearchValues,
    setHostessSearchValues,
    searchResults,
    searchLoading,
    handleHabitacionChange,
    handleClearSearch,
    handleAddProducto,
    handleRemoveProducto,
    handleCantidadChangeTable,
    totals,
    handleSubmit,
    requiresRoom,
    isChampagneProduct,
    commissionTotal
  } = useNewSaleForm();

  const [hasOpenCaja, setHasOpenCaja] = useState<boolean | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalCategoria, setModalCategoria] = useState<any>(null);
  const [productosCategoria, setProductosCategoria] = useState<any[]>([]);
  const [loadingProductos, setLoadingProductos] = useState(false);

  const {
    clients: clientes,
    anfitrionas,
    rooms: habitaciones,
    categories,
    isLoading: loadingCategorias,
    refreshAll
  } = useMasterData();
  useRefreshOnFocus(refreshAll, { immediate: false });

  const categoriasFiltradas = useMemo(
    () => categories.filter(cat => cat?.estado === 1 && (cat?.productCount || 0) > 0),
    [categories]
  );

  const handleOpenCategoria = async (cat: any) => {
    setModalCategoria(cat);
    setModalOpen(true);
    setLoadingProductos(true);
    try {
      const res = await fetch(`/api/products?category_id=${cat.id_categoria || cat.id}`);
      const data = await res.json();
      if (data.success) setProductosCategoria(data.data);
    } finally {
      setLoadingProductos(false);
    }
  };

  const handleHandleSubmit = () => handleSubmit(clientes, anfitrionas);

  return (
    <>
      <NewSaleHeader />

      <div className='mx-4 mb-10 space-y-4 sm:mx-6 sm:space-y-6 lg:mx-8 dark:text-neutral-100'>
        <CajaStatusCheck onStatusChange={setHasOpenCaja} />

        <NewSaleSearch
          searchProducto={searchProducto}
          setSearchProducto={setSearchProducto}
          handleClearSearch={handleClearSearch}
          searchLoading={searchLoading}
          searchResults={searchResults}
          anfitrionas={anfitrionas}
          champagneHostessSelections={champagneHostessSelections}
          handleChampagneHostessChange={(id, ids) => {
            const prod = searchResults.find(p => String(p.id_producto || p.id) === id);
            if (prod) {
              const price = Number(prod.precio || prod.price || 0);
              let max = 1;
              if (price >= 240000) max = 5;
              else if (price >= 200000) max = 4;
              else if (price >= 140000) max = 3;
              else if (price >= 120000) max = 2;
              if (ids.length <= max) {
                setChampagneHostessSelections(prev => ({ ...prev, [id]: ids }));
              }
            }
          }}
          hostessSearchValues={hostessSearchValues}
          setHostessSearchValues={setHostessSearchValues}
          otherProductHostessSelections={otherProductHostessSelections}
          handleOtherProductHostessChange={(id, ids) =>
            setOtherProductHostessSelections(prev => ({ ...prev, [id]: ids }))
          }
          handleAddProducto={handleAddProducto}
          isChampagneProduct={isChampagneProduct}
        />

        <CategoryCardList
          categorias={categoriasFiltradas}
          onSelect={handleOpenCategoria}
          center={true}
          loading={loadingCategorias}
        />

        <NewSaleConfiguration
          clientes={clientes}
          selectedCliente={selectedCliente}
          setSelectedCliente={setSelectedCliente}
          requiresRoom={requiresRoom}
          habitaciones={habitaciones}
          selectedHabitacion={selectedHabitacion}
          handleHabitacionChange={handleHabitacionChange}
          manualTime={manualTime}
          setManualTime={setManualTime}
          metodoPago={metodoPago}
          setMetodoPago={setMetodoPago}
          propina={totals.propina}
          enableTip={enableTip}
          setEnableTip={setEnableTip}
        />

        <NewSaleSummary
          subtotal={totals.subtotal}
          propina={totals.propina}
          cargoTarjeta={totals.cargoTarjeta}
          metodoPago={metodoPago}
          total={totals.total}
          loading={loading}
          disabled={loading || !productos.length || !metodoPago || hasOpenCaja === false}
          onSubmit={handleHandleSubmit}
        />

        <NewSaleCart
          productos={productos}
          anfitrionas={anfitrionas}
          handleCantidadChangeTable={handleCantidadChangeTable}
          handleRemoveProducto={handleRemoveProducto}
        />
      </div>

      <SaleProductModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        loading={loadingProductos}
        productos={productosCategoria}
        cantidades={cantidades}
        handleCantidadChange={(id, val) =>
          setCantidades(prev => ({ ...prev, [id]: parseInt(val) || 1 }))
        }
        handleAgregarProducto={handleAddProducto}
        categoria={modalCategoria}
        anfitrionas={anfitrionas}
        champagneHostessSelections={champagneHostessSelections}
        onChampagneHostessChange={(id, ids) =>
          setChampagneHostessSelections(prev => ({ ...prev, [id]: ids }))
        }
        otherProductHostessSelections={otherProductHostessSelections}
        onOtherProductHostessChange={(id, ids) =>
          setOtherProductHostessSelections(prev => ({ ...prev, [id]: ids }))
        }
        productosEnCarrito={productos}
      />
    </>
  );
}
