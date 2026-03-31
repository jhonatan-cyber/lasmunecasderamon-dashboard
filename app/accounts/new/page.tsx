'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { useUsers } from '@/hooks/personal/useUsers';
import useRooms from '@/hooks/habitaciones/useRooms';
import { useTimer } from '@/contexts/TimerContext';
import { useAccountForm } from '@/hooks/cuentas/useAccountForm';
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
import { useClientes } from '@/hooks/clientes';

export default function NewCuentaPage() {
  const router = useRouter();
  const { allClients } = useClientes();
  const { users } = useUsers();
  const { rooms } = useRooms();
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

  const [clientes, setClientes] = useState<any[]>([]);
  const [categoriasConProductos, setCategoriasConProductos] = useState<any[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalCategoria, setModalCategoria] = useState<any>(null);
  const [productosCategoria, setProductosCategoria] = useState<any[]>([]);
  const [loadingProductos, setLoadingProductos] = useState(false);


  const anfitrionas = users.filter(
    user => user.role?.toLowerCase().includes('anfitriona') && user.status === 1
  );

  useEffect(() => {
    if (allClients) {
      setClientes(allClients);
    }
  }, [allClients]);


  useEffect(() => {
    const fetchCategorias = async () => {
      try {
        const res = await fetch('/api/categories');
        const data = await res.json();
        if (data.success) {
          await loadCategoriasConProductos(data.data);
        }
      } catch (error) {
        console.error('Error al cargar categorías:', error);
        toast.error('Error al cargar categorías');
      }
    };
    fetchCategorias();
  }, []);

  const loadCategoriasConProductos = async (categoriasData: any[]) => {
    const categoriasConConteo = categoriasData.map(cat => ({
      ...cat,
      productCount: cat.total_products || 0,
      id_categoria: cat.id,
      nombre: cat.name || cat.nombre,
      estado: cat.status
    }));
    setCategoriasConProductos(categoriasConConteo);
  };

  const categoriasFiltradas = Array.isArray(categoriasConProductos)
    ? categoriasConProductos.filter(cat => cat?.estado === 1 && cat?.productCount > 0)
    : [];

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
          anfitrionas={anfitrionas}
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
