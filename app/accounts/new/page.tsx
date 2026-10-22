'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useTimer } from '@/contexts/TimerContext';
import { useAccountForm } from '@/hooks/accounts/useAccountForm';
import { useMasterData, useRefreshOnFocus } from '@/hooks/shared';
import CategoryCardList from '@/components/shared/CategoryCardList';
import SaleProductModal from '@/components/sales/SaleProductModal';
import { mapForSaleToCartItem } from '@/lib/sales/forSaleMapper';
import { toast } from 'sonner';

import {
  ProductSearch,
  AccountFormData,
  AnfitrionaInfo,
  AccountSummary,
  ProductTable,
  NewAccountHeader
} from '@/components/accounts';

export default function NewCuentaPage() {
  const router = useRouter();
  const { clients, rooms, categories, anfitrionas, refreshAll } = useMasterData();
  const { startTimer } = useTimer();

  const {
    loading,
    selectedCliente,
    selectedAnfitrionas,
    selectedHabitacion,
    productos,
    searchProducto,
    cantidades,
    hasChampagneProducts,
    hasCommissionProducts,
    maxChampagnePrice,
    maxAnfitrionas,
    total,
    selectedTime,
    setSelectedCliente,
    setSelectedAnfitrionas,
    setSelectedHabitacion,
    setSearchProducto,
    setSelectedTime,
    handleCantidadChange,
    handleAddProducto,
    handleRemoveProducto,
    handleCantidadChangeTable,
    handleClearSearch,
    handleSubmit: handleAccountSubmit
  } = useAccountForm();

  const [modalOpen, setModalOpen] = useState(false);
  const [modalCategoria, setModalCategoria] = useState<any>(null);
  const [productosCategoria, setProductosCategoria] = useState<any[]>([]);
  const [loadingProductos, setLoadingProductos] = useState(false);
  const [hostessSelections, setHostessSelections] = useState<Record<string, string[]>>({});

  const clientes = clients;
  const anfitrionasFiltradas = useMemo(
    () =>
      anfitrionas.filter(
        user => user.role?.toLowerCase().includes('anfitriona') && user.status === 1
      ),
    [anfitrionas]
  );

  useRefreshOnFocus(refreshAll, { immediate: false });

  const categoriasFiltradas = useMemo(() => {
    return Array.isArray(categories)
      ? categories.filter(cat => cat?.estado === 1 && (cat?.productCount || 0) > 0)
      : [];
  }, [categories]);

  const handleOpenCategoria = async (cat: any) => {
    setModalCategoria(cat);
    setModalOpen(true);
    setLoadingProductos(true);
    setProductosCategoria([]);
    try {
      const res = await fetch(
        `/api/products?for_sale=1&category_id=${encodeURIComponent(cat.id_categoria || cat.id)}`,
        { cache: 'no-store' }
      );
      const data = await res.json();
      if (!res.ok || !data.success)
        throw Error(data.message || 'No se pudieron cargar los productos del bar');
      setProductosCategoria(data.data.map(mapForSaleToCartItem));
    } catch {
      setProductosCategoria([]);
      toast.error('No se pudieron cargar los productos del bar');
    } finally {
      setLoadingProductos(false);
    }
  };

  const handleSubmit = async () => {
    await handleAccountSubmit(clientes, rooms, startTimer, () => {
      router.push('/accounts');
    });
  };

  return (
    <>
      <div className='p-4 sm:p-6 lg:p-10 space-y-4 sm:space-y-6 mt-4 sm:mt-6 lg:mt-10'>
        <NewAccountHeader />
        <ProductSearch
          forSale
          searchProducto={searchProducto}
          onSearchChange={setSearchProducto}
          onAddProduct={product => {
            setModalCategoria(null);
            setProductosCategoria([product]);
            setModalOpen(true);
          }}
          onClearSearch={handleClearSearch}
        />

        <CategoryCardList
          categorias={categoriasFiltradas}
          onSelect={handleOpenCategoria}
          center={true}
          filter={cat => cat?.estado === 1 && (cat?.productCount ?? 0) > 0}
        />

        <AccountFormData
          clientes={clientes}
          anfitrionas={anfitrionasFiltradas}
          habitaciones={rooms}
          selectedCliente={selectedCliente}
          selectedAnfitrionas={selectedAnfitrionas}
          selectedHabitacion={selectedHabitacion}
          selectedTime={selectedTime}
          hasCommissionProducts={hasCommissionProducts}
          maxAnfitrionas={maxAnfitrionas}
          loading={loading}
          onClienteChange={setSelectedCliente}
          onAnfitrionaChange={setSelectedAnfitrionas}
          onHabitacionChange={setSelectedHabitacion}
          onTimeChange={setSelectedTime}
        />

        {Array.isArray(productos) && productos.length > 0 && (
          <AnfitrionaInfo
            hasChampagneProducts={hasChampagneProducts}
            maxChampagnePrice={maxChampagnePrice}
            maxAnfitrionas={maxAnfitrionas}
          />
        )}

        <AccountSummary
          total={total}
          loading={loading}
          hasChampagneProducts={hasChampagneProducts}
          selectedCliente={selectedCliente || null}
          selectedAnfitrionas={selectedAnfitrionas}
          productosLength={productos.length}
          onSubmit={handleSubmit}
        />

        <div className='mt-8'>
          <div className='text-center text-gray-400 text-sm mb-2'>Detalles Producto</div>
          <ProductTable
            productos={productos}
            onCantidadChange={handleCantidadChangeTable}
            onRemoveProducto={handleRemoveProducto}
          />
        </div>
      </div>

      <SaleProductModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        loading={loadingProductos}
        productos={productosCategoria}
        cantidades={cantidades}
        handleCantidadChange={handleCantidadChange}
        handleAgregarProducto={handleAddProducto}
        categoria={modalCategoria}
        anfitrionas={anfitrionasFiltradas}
        champagneHostessSelections={hostessSelections}
        onChampagneHostessChange={(id, ids) =>
          setHostessSelections(previous => ({ ...previous, [id]: ids }))
        }
        otherProductHostessSelections={hostessSelections}
        onOtherProductHostessChange={(id, ids) =>
          setHostessSelections(previous => ({ ...previous, [id]: ids }))
        }
        productosEnCarrito={productos}
      />
    </>
  );
}
