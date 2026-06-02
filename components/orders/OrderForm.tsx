import { useCallback } from 'react';
import dynamic from 'next/dynamic';
import OrderProductTable from './OrderProductTable';
import { CustomerSelect } from '@/components/shared/selects';
import OrderTotalHeader from '@/components/orders/OrderTotalHeader';
import CategoryCardList from '@/components/shared/CategoryCardList';
import { useOrderForm, type OrderProducto, type OrderCategory, type OrderProductoPayload } from '@/hooks/personal';

const CategoryProductsModal = dynamic(() => import('@/components/orders/CategoryProductsModal'), {
  loading: () => (
    <div className='fixed inset-0 bg-black/50 flex items-center justify-center z-50'>
      <div className='rounded-lg bg-white p-6 dark:bg-zinc-900 dark:border dark:border-zinc-800'>
        <div className='animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto'></div>
        <p className='mt-2 text-sm text-gray-600 dark:text-zinc-400'>Cargando productos...</p>
      </div>
    </div>
  ),
  ssr: false
});

interface OrderFormProps {
  clientes: Array<{ id_cliente?: string | number; id?: string | number }>;
  anfitrionas: Array<{ id_usuario?: string | number; id?: string | number }>;
  categorias: OrderCategory[];
  productos: Array<OrderProducto>;
  selectedCliente: string;
  setSelectedCliente: (v: string) => void;
  selectedAnfitrionas: string[];
  setSelectedAnfitrionas?: (v: string[]) => void;
  onAddProducto?: (producto: OrderProductoPayload) => void;
  onRemoveProducto?: (index: number) => void;
  onUpdateCantidad?: (index: number, nuevaCantidad: number) => void;
  onToggleComision?: (index: number) => void;
  onAssignHostess?: (index: number, hostessId: string) => void;
  onSubmit?: () => void;
  searchCliente?: string;
  setSearchCliente?: (v: string) => void;
  searchAnfitriona?: string;
  setSearchAnfitriona?: (v: string) => void;
}

export default function OrderForm({
  clientes,
  anfitrionas,
  categorias,
  productos,
  selectedCliente,
  setSelectedCliente,
  selectedAnfitrionas,
  setSelectedAnfitrionas,
  onAddProducto,
  onRemoveProducto,
  onUpdateCantidad,
  onToggleComision,
  onAssignHostess,
  onSubmit,
  searchCliente,
  setSearchCliente,
  searchAnfitriona,
  setSearchAnfitriona
}: OrderFormProps) {
  const {
    modalOpen, setModalOpen,
    modalCategoria,
    productosCategoria,
    loadingProductos,
    cantidades,
    champagneHostessSelections,
    otherProductHostessSelections,
    roomSelections,
    propina,
    propinaHabilitada,
    error,
    subtotal,
    total,
    rooms,
    handleTipChange,
    handleOpenCategoria,
    handleCantidadChange,
    handleChampagneHostessChange,
    handleOtherProductHostessChange,
    handleRoomChange,
    handleAgregarProducto,
    handleSubmitInternal
  } = useOrderForm({
    productos,
    selectedCliente,
    setSelectedCliente,
    onAddProducto,
    onUpdateCantidad,
    onAssignHostess,
    onToggleComision,
    onSubmit
  });

  const handleUpdateCantidadAction = useCallback(
    (index: number, nuevaCantidad: number) => {
      if (onUpdateCantidad) onUpdateCantidad(index, nuevaCantidad);
    },
    [onUpdateCantidad]
  );

  const handleAssignHostessAction = useCallback(
    (index: number, hostessId: string) => {
      onAssignHostess?.(index, hostessId);
    },
    [onAssignHostess]
  );

  const handleToggleComisionAction = useCallback(
    (index: number) => {
      if (onToggleComision) onToggleComision(index);
    },
    [onToggleComision]
  );

  return (
    <div className='space-y-8'>
      <CategoryCardList
        categorias={categorias}
        onSelect={handleOpenCategoria}
        filter={(c: OrderCategory) =>
          c.status === 1 && (c.total_products || 0) > 0
        }
      />

      <div className='mb-6 grid grid-cols-1 gap-6 lg:grid-cols-2 lg:items-start'>
        <div className='flex-1'>
          <CustomerSelect
            clientes={clientes}
            value={selectedCliente}
            onChange={setSelectedCliente}
            label='Cliente (Opcional)'
            placeholder='Sin cliente seleccionado'
            required={false}
            className='w-full'
          />
        </div>

        <OrderTotalHeader
          total={total}
          subtotal={subtotal}
          onSubmit={handleSubmitInternal}
          tipPercentage={propina}
          tipEnabled={propinaHabilitada}
          onTipChange={handleTipChange}
        />
      </div>

      <CategoryProductsModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        loading={loadingProductos}
        productosCategoria={productosCategoria}
        cantidades={cantidades}
        handleCantidadChange={handleCantidadChange}
        handleAgregarProducto={handleAgregarProducto}
        modalCategoria={modalCategoria}
        anfitrionas={anfitrionas}
        champagneHostessSelections={champagneHostessSelections}
        onChampagneHostessChange={handleChampagneHostessChange}
        otherProductHostessSelections={otherProductHostessSelections}
        onOtherProductHostessChange={handleOtherProductHostessChange}
        productosEnCarrito={productos}
        habitaciones={rooms}
        roomSelections={roomSelections}
        onRoomChange={handleRoomChange}
      />

      {error && (
        <div className='rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/70 dark:bg-red-950/40 dark:text-red-300'>
          {error}
        </div>
      )}

      <div className='mt-8'>
        <div className='mb-4 text-center'>
          <div className='text-[11px] font-semibold uppercase tracking-[0.2em] text-zinc-400 dark:text-zinc-500'>
            Detalles del pedido
          </div>
          <div className='mt-1 text-sm text-zinc-500 dark:text-zinc-400'>
            RevisÃ¡ cantidades, comisiones y asignaciones antes de generar el pedido
          </div>
        </div>
        <OrderProductTable
          productos={productos}
          onRemoveProducto={onRemoveProducto}
          onUpdateCantidad={handleUpdateCantidadAction}
          onToggleComision={handleToggleComisionAction}
          onAssignHostess={handleAssignHostessAction}
          anfitrionas={anfitrionas}
          habitaciones={rooms}
        />
      </div>
    </div>
  );
}




