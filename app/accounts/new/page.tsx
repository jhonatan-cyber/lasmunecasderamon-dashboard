'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useTimer } from '@/contexts/TimerContext';
import { useAccountForm } from '@/hooks/cuentas/useAccountForm';
import { useMasterData, useRefreshOnFocus } from '@/hooks/shared';
import CategoryCardList from '@/components/shared/CategoryCardList';
import ProductModal from '@/components/products/ProductModal';

import {
  ProductSearch,
  AccountFormData,
  AnfitrionaInfo,
  AccountSummary,
  ProductTable,
  NewAccountHeader
} from '@/components/cuentas';

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
    try {
      const res = await fetch(`/api/products?category_id=${cat.id_categoria || cat.id}`);
      const data = await res.json();
      if (data.success) setProductosCategoria(data.data);
      else setProductosCategoria([]);
    } catch {
      setProductosCategoria([]);
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
          searchProducto={searchProducto}
          onSearchChange={setSearchProducto}
          onAddProduct={handleAddProducto}
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

      <ProductModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        loading={loadingProductos}
        productos={productosCategoria}
        cantidades={cantidades}
        handleCantidadChange={handleCantidadChange}
        handleAgregarProducto={handleAddProducto}
        categoria={modalCategoria}
      />
    </>
  );
}
