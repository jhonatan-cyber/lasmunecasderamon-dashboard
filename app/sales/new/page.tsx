'use client';

import { useState, useMemo, useRef, useEffect } from 'react';
import { toast } from 'sonner';
import { mapForSaleToCartItem } from '@/lib/sales/forSaleMapper';
import { getHostessLimit } from '@/components/orders/productModalRules';
import { resolverVentaProducto } from '@/lib/sales/saleChoice';
import { esCortoAnfitriona } from '@/lib/sales/hostessShortPrices';
import { useNewSaleForm } from '@/hooks/sales/useNewSaleForm';
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
    servicioId,
    servicioNombre,
    servicioAnfitrionas,
    selectedCliente,
    setSelectedCliente,
    selectedHabitacion,
    metodoPago,
    setMetodoPago,
    productos,
    setProductos,
    enableTip,
    setEnableTip,
    loading,
    searchProducto,
    setSearchProducto,
    manualTime,
    setManualTime,
    cantidades,
    setCantidades,
    champagneHostessSelections: champagneOverrides,
    setChampagneHostessSelections,
    otherProductHostessSelections: otherOverrides,
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
    getChampagneMax,
    handleServiceHostessChange,
    handleCartHostessesChange,
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
  const categoryRequest = useRef<AbortController | null>(null);
  useEffect(() => () => categoryRequest.current?.abort(), []);

  const {
    clients: clientes,
    anfitrionas,
    rooms: habitaciones,
    categories,
    isLoading: loadingCategorias,
    refreshAll
  } = useMasterData({ soloAnfitrionasEnLocal: true, categoriasConStockBar: true });
  useRefreshOnFocus(refreshAll, { immediate: false });

  const selectedClienteSaldo = useMemo(() => {
    const cliente = clientes.find(
      (c: any) => String(c.id ?? c.id_cliente ?? '') === String(selectedCliente)
    );
    return Number(cliente?.saldo ?? cliente?.saldo_prepago ?? 0);
  }, [clientes, selectedCliente]);

  const defaultHostesses = useMemo(
    () =>
      Object.fromEntries(
        [...searchResults, ...productosCategoria].flatMap(product => {
          const ids = servicioAnfitrionas.slice(0, getHostessLimit(product));
          return [...new Set([product.id, product.id_producto].filter(Boolean).map(String))].map(
            id => [id, ids]
          );
        })
      ),
    [searchResults, productosCategoria, servicioAnfitrionas]
  );
  const champagneHostessSelections = { ...defaultHostesses, ...champagneOverrides };
  const otherProductHostessSelections = { ...defaultHostesses, ...otherOverrides };

  const categoriasFiltradas = useMemo(
    () => categories.filter(cat => cat?.estado === 1 && (cat?.productCount || 0) > 0),
    [categories]
  );

  const handleOpenCategoria = async (cat: any) => {
    categoryRequest.current?.abort();
    const controller = new AbortController();
    categoryRequest.current = controller;
    setModalCategoria(cat);
    setProductosCategoria([]);
    setModalOpen(true);
    setLoadingProductos(true);
    try {
      const res = await fetch(
        `/api/products?for_sale=1&category_id=${encodeURIComponent(cat.id_categoria || cat.id)}`,
        { cache: 'no-store', signal: controller.signal }
      );
      const data = await res.json();
      if (!res.ok || !data.success || !Array.isArray(data.data))
        throw new Error(data.message || 'No se pudieron cargar los productos del bar');
      if (!controller.signal.aborted) setProductosCategoria(data.data.map(mapForSaleToCartItem));
    } catch (error) {
      if (!controller.signal.aborted)
        toast.error(
          error instanceof Error ? error.message : 'No se pudieron cargar los productos del bar'
        );
    } finally {
      if (!controller.signal.aborted) setLoadingProductos(false);
    }
  };

  // Misma cantidad compartida por el buscador rápido y el modal de categoría: al agregar,
  // el carro recibe las unidades pedidas para esa presentación.
  const handleCantidadChange = (id: string, val: string) =>
    setCantidades(prev => ({ ...prev, [id]: parseInt(val) || 1 }));

  const handleHandleSubmit = () => handleSubmit(clientes, anfitrionas);

  return (
    <>
      {servicioId && (
        <div className='mx-4 rounded-xl border p-4 text-sm'>
          Venta adicional · {servicioNombre || 'Cargando habitación…'} · Conserva el tiempo del
          servicio.
          <p className='mt-1 text-xs text-muted-foreground'>
            Los cambios de anfitrionas se aplicarán también al privado al registrar la venta.
          </p>
        </div>
      )}
      <NewSaleHeader
        onBack={() => {
          setProductos([]);
          try {
            localStorage.removeItem('productos');
          } catch {}
        }}
      />

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
          handleChampagneHostessChange={async (id, ids) => {
            const prod = searchResults.find(p => String(p.id_producto || p.id) === id);
            if (prod) {
              const max = await getChampagneMax(prod);
              if (ids.length <= max) {
                handleServiceHostessChange(champagneHostessSelections[id] || [], ids);
                setChampagneHostessSelections(prev => ({ ...prev, [id]: ids }));
              }
            }
          }}
          hostessSearchValues={hostessSearchValues}
          setHostessSearchValues={setHostessSearchValues}
          otherProductHostessSelections={otherProductHostessSelections}
          handleOtherProductHostessChange={(id, ids) => {
            handleServiceHostessChange(otherProductHostessSelections[id] || [], ids);
            setOtherProductHostessSelections(prev => ({ ...prev, [id]: ids }));
          }}
          handleAddProducto={producto => {
            categoryRequest.current?.abort();
            setModalCategoria(null);
            const format = resolverVentaProducto(producto).opciones.find(
              option =>
                option.precio === producto.precio &&
                option.esShot === (producto.tipo_venta === 'shot') &&
                esCortoAnfitriona(option.value) === Boolean(producto.shot_anfitriona)
            )?.value;
            setProductosCategoria(previous => [
              {
                ...producto,
                modalCantidades: {
                  ...(previous[0]?.id === producto.id ? previous[0]?.modalCantidades : {}),
                  ...(format ? { [format]: producto.cantidad } : {})
                }
              }
            ]);
            setLoadingProductos(false);
            setModalOpen(true);
          }}
          isChampagneProduct={isChampagneProduct}
          cantidades={cantidades}
          handleCantidadChange={handleCantidadChange}
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
          metodoPago={metodoPago}
          total={totals.total}
          loading={loading}
          disabled={loading || !productos.length || !metodoPago || hasOpenCaja === false}
          onSubmit={handleHandleSubmit}
          saldo={selectedClienteSaldo}
        />

        <NewSaleCart
          productos={productos}
          anfitrionas={anfitrionas}
          handleCantidadChangeTable={handleCantidadChangeTable}
          handleRemoveProducto={handleRemoveProducto}
          onHostessesChange={handleCartHostessesChange}
        />
      </div>

      <SaleProductModal
        open={modalOpen}
        onClose={() => {
          categoryRequest.current?.abort();
          setModalOpen(false);
          setProductosCategoria([]);
        }}
        loading={loadingProductos}
        productos={productosCategoria}
        cantidades={cantidades}
        handleCantidadChange={handleCantidadChange}
        handleAgregarProducto={handleAddProducto}
        categoria={modalCategoria}
        anfitrionas={anfitrionas}
        champagneHostessSelections={champagneHostessSelections}
        onChampagneHostessChange={async (id, ids) => {
          const prod = productosCategoria.find(p => String(p.id_producto || p.id) === id);
          const max = prod ? await getChampagneMax(prod) : 5;
          if (ids.length <= max) {
            handleServiceHostessChange(champagneHostessSelections[id] || [], ids);
            setChampagneHostessSelections(prev => ({ ...prev, [id]: ids }));
          }
        }}
        otherProductHostessSelections={otherProductHostessSelections}
        onOtherProductHostessChange={(id, ids) => {
          handleServiceHostessChange(otherProductHostessSelections[id] || [], ids);
          setOtherProductHostessSelections(prev => ({ ...prev, [id]: ids }));
        }}
        productosEnCarrito={productos}
      />
    </>
  );
}
