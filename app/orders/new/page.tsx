'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { useMasterData, useRefreshOnFocus } from '@/hooks/shared';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { OrderForm, ServiceOrderFormNew as ServiceOrderForm } from '@/components/orders';

export default function NewOrder() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('productos');
  const [selectedCliente, setSelectedCliente] = useState('');
  const [selectedAnfitrionas, setSelectedAnfitrionas] = useState<string[]>([]);
  const [productos, setProductos] = useState<any[]>([]); // productos agregados
  const { clients: clientes, anfitrionas, categories, refreshAll } = useMasterData();
  const [searchCliente, setSearchCliente] = useState('');
  const [searchAnfitriona, setSearchAnfitriona] = useState('');
  useRefreshOnFocus(refreshAll, { immediate: false });

  const clientesFiltrados = useMemo(() => {
    if (!searchCliente) return clientes;
    const term = searchCliente.toLowerCase();
    return clientes.filter(c => {
      const texto = `${c.name || ''} ${c.lastName || ''} ${c.run || ''}`.toLowerCase();
      return texto.includes(term);
    });
  }, [clientes, searchCliente]);

  const anfitrionasFiltradas = useMemo(() => {
    const term = searchAnfitriona.toLowerCase();
    return anfitrionas.filter(a => {
      const estado = a.estado || a.status;
      if (estado !== 1 && estado !== 2) return false;
      const texto = `${a.nick || a.nombre || ''}`.toLowerCase();
      return texto.includes(term);
    });
  }, [anfitrionas, searchAnfitriona]);

  const categoriasFiltradas = useMemo(() => {
    return categories.filter(cat => cat.status === 1 && (cat.total_products || 0) > 0);
  }, [categories]);

  // Handler para eliminar producto
  const handleRemoveProducto = (idx: number) => {
    setProductos((prev: any[]) => prev.filter((_, i) => i !== idx));
  };

  // Handler para agregar producto (mock)
  const handleAddProducto = (producto: any) => {
    setProductos((prev: any[]) => [...prev, producto]);
  };

  // Handler para actualizar cantidad de producto
  const handleUpdateCantidad = (index: number, nuevaCantidad: number) => {
    setProductos((prev: any[]) =>
      prev.map((producto, i) => {
        if (i !== index) return producto;

        // Obtener la comisión unitaria
        // Si ya existe comisionUnitaria, usarla; si no, calcularla desde la comisión actual
        const comisionUnitaria =
          producto.comisionUnitaria ??
          (producto.cantidad > 0 ? (producto.comision || 0) / producto.cantidad : 0);

        return {
          ...producto,
          cantidad: nuevaCantidad,
          subtotal: (producto.precio || producto.price) * nuevaCantidad,
          comision: comisionUnitaria * nuevaCantidad,
          comisionUnitaria: comisionUnitaria // Guardar para futuros cálculos
        };
      })
    );
  };

  const handleAssignHostess = (index: number, hostessId: string) => {
    setProductos((prev: any[]) => prev.map((p, i) => (i === index ? { ...p, hostessId } : p)));
  };

  // Handler para toggle de comisión
  const handleToggleComision = (index: number) => {
    setProductos((prev: any[]) =>
      prev.map((producto, i) =>
        i === index
          ? {
              ...producto,
              generaComision: producto.generaComision === 1 ? 0 : 1,
              hostessId: producto.generaComision === 1 ? '' : producto.hostessId
            }
          : producto
      )
    );
  };

  // Handler para submit (mock)
  const handleSubmit = () => {
    // Si no hay cliente seleccionado, usar cliente ID 1 por defecto
    const clienteId = selectedCliente || '1';
  };

  const hasChampagne = productos.some((item: any) => {
    const cat = (item.categoria || '').toLowerCase();
    return cat.includes('champaña') || cat.includes('shampaña') || cat.includes('champagne');
  });

  return (
    <>
      <div className='flex items-center justify-between mt-10 p-8'>
        <div>
          <h2 className='text-2xl font-bold text-gray-900 dark:text-zinc-100'>
            Datos Ticket Pedido
          </h2>
          <div className='uppercase text-xs tracking-widest text-gray-400 dark:text-zinc-500 font-semibold mb-1'>
            Las muñecas de Ramón
          </div>
        </div>

        <Button
          variant='outline'
          className='rounded-full bg-black text-white hover:scale-105 transition-all duration-200 dark:bg-zinc-100 dark:text-zinc-950 dark:hover:bg-white'
          onClick={() => router.back()}
          type='button'
        >
          <ArrowLeft />
          Atrás
        </Button>
      </div>
      <div className='p-8 ml-8 mr-8 space-y-6'>
        <Tabs value={activeTab} onValueChange={setActiveTab} className='w-full'>
          <TabsList className='mb-6 flex w-full justify-start gap-2 rounded-full bg-gray-100 p-1 dark:bg-gray-800'>
            <TabsTrigger value='productos' className='flex-1 rounded-full'>
              Pedidos de Productos
            </TabsTrigger>
            <TabsTrigger value='servicios' className='flex-1 rounded-full'>
              Pedidos de Servicio
            </TabsTrigger>
          </TabsList>

          <TabsContent value='productos' className='space-y-6'>
            <OrderForm
              clientes={clientesFiltrados}
              anfitrionas={anfitrionasFiltradas}
              categorias={categoriasFiltradas}
              productos={productos}
              selectedCliente={selectedCliente}
              setSelectedCliente={setSelectedCliente}
              selectedAnfitrionas={selectedAnfitrionas}
              setSelectedAnfitrionas={setSelectedAnfitrionas}
              onAddProducto={handleAddProducto}
              onRemoveProducto={handleRemoveProducto}
              onUpdateCantidad={handleUpdateCantidad}
              onToggleComision={handleToggleComision}
              onAssignHostess={handleAssignHostess}
              onSubmit={handleSubmit}
              searchCliente={searchCliente}
              setSearchCliente={setSearchCliente}
              searchAnfitriona={searchAnfitriona}
              setSearchAnfitriona={setSearchAnfitriona}
            />
          </TabsContent>

          <TabsContent value='servicios' className='space-y-6'>
            <ServiceOrderForm
              clientes={clientes}
              anfitrionas={anfitrionas}
              searchCliente={searchCliente}
              setSearchCliente={setSearchCliente}
              searchAnfitriona={searchAnfitriona}
              setSearchAnfitriona={setSearchAnfitriona}
            />
          </TabsContent>
        </Tabs>
      </div>
    </>
  );
}
