/* eslint-disable */
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  ArrowLeft,
  Search,
  Wine,
  Users,
  ShoppingCart,
  Trash,
  Plus,
  X,
  MoreVertical
} from 'lucide-react';
import { useCuentas } from '@/hooks/caja/useCuentas';
import { useClients } from '@/hooks/clientes/useClients';
import { useUsers } from '@/hooks/personal/useUsers';
import useRooms from '@/hooks/habitaciones/useRooms';
import { useTimer } from '@/contexts/TimerContext';
import { toast } from 'sonner';
import { formatCurrencyCLP } from '@/lib/formatters';
import { CreateCuentaRequest, CreateDetalleCuentaRequest } from '@/types/cuenta';
import CustomerSelect from '@/components/ui/CustomerSelect';
import HostessSelect from '@/components/ui/HostessSelect';
import RoomSelect from '@/components/ui/RoomSelect';
import CategoryCardList from '@/components/ui/CategoryCardList';
import ProductModal from '@/components/ui/productModal';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';

export default function NewCuentaPage() {
  const router = useRouter();
  const { createCuenta } = useCuentas();
  const { allClients } = useClients();
  const { users } = useUsers();
  const { rooms } = useRooms();
  const { startTimer } = useTimer();
  const [loading, setLoading] = useState(false);

  // Estados del formulario
  const [selectedCliente, setSelectedCliente] = useState('');
  const [selectedAnfitrionas, setSelectedAnfitrionas] = useState<string[]>([]);
  const [selectedHabitacion, setSelectedHabitacion] = useState('');
  const [productos, setProductos] = useState<any[]>([]);
  const [searchProducto, setSearchProducto] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [categoriasConProductos, setCategoriasConProductos] = useState<any[]>([]);
  const [categorias, setCategorias] = useState<any[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalCategoria, setModalCategoria] = useState<any>(null);
  const [productosCategoria, setProductosCategoria] = useState<any[]>([]);
  const [cantidades, setCantidades] = useState<Record<string, number>>({});
  const [loadingProductos, setLoadingProductos] = useState(false);

  // Función para generar código automático de 8 dígitos
  const generateCodigo = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 8; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  };

  // Filtrar anfitrionas (usuarios con rol de anfitriona)
  const anfitrionas = users.filter(
    user => user.role?.toLowerCase().includes('anfitriona') && user.status === 1
  );

  // Cargar clientes
  const [clientes, setClientes] = useState<any[]>([]);
  useEffect(() => {
    if (allClients) {
      setClientes(allClients);
    }
  }, [allClients]);

  // Cargar categorías
  useEffect(() => {
    const fetchCategorias = async () => {
      try {
        const res = await fetch('/api/categories');
        const data = await res.json();
        if (data.success) {
          setCategorias(data.data);
          await loadCategoriasConProductos(data.data);
        }
      } catch (error) {
        console.error('Error al cargar categorías:', error);
      }
    };
    fetchCategorias();
  }, []);

  const loadCategoriasConProductos = async (categoriasData: any[]) => {
    const categoriasConConteo = categoriasData.map(cat => {
      // Usar total_products del endpoint o 0 si no existe
      const productCount = cat.total_products || 0;
      return {
        ...cat,
        productCount,
        // Asegurar que tenga los campos esperados por el componente
        id_categoria: cat.id,
        nombre: cat.name || cat.nombre,
        estado: cat.status
      };
    });
    setCategoriasConProductos(categoriasConConteo);
  };

  // Filtrar categorías como en ventas
  const categoriasFiltradas = Array.isArray(categoriasConProductos)
    ? categoriasConProductos.filter(cat => cat?.estado === 1 && cat?.productCount > 0)
    : [];

  const getProductCountByCategory = async (categoryId: number) => {
    try {
      const res = await fetch(`/api/products?category_id=${categoryId}`);
      const data = await res.json();
      return data.length || 0;
    } catch (error) {
      console.error('Error al obtener productos por categoría:', error);
      return 0;
    }
  };

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

  const handleCantidadChange = (id: string, value: string) => {
    setCantidades(prev => ({
      ...prev,
      [id]: parseInt(value) || 0
    }));
  };

  const handleAddProducto = (producto: any) => {
    const cantidad = cantidades[producto.id_producto] || 1;
    const precio = producto.precio || producto.price || 0;
    const comision = producto.commission || producto.comision || 0; // La API devuelve 'commission'

    const nuevoProducto = {
      ...producto,
      cantidad,
      precio: precio, // Asegurar que el precio esté definido
      comision: comision, // Comisión por unidad
      subtotal: precio * cantidad
    };

    setProductos(prev => [...prev, nuevoProducto]);
    setCantidades(prev => {
      const newCantidades = { ...prev };
      delete newCantidades[producto.id_producto];
      return newCantidades;
    });

    // Obtener el nombre del producto de diferentes campos posibles
    const nombreProducto = producto.nombre || producto.name || producto.product_name || 'Producto';
    toast.success(`${nombreProducto} agregado`);
  };

  const handleRemoveProducto = (index: number) => {
    setProductos(prev => prev.filter((_, i) => i !== index));
  };

  const handleCantidadChangeTable = (index: number, nuevaCantidad: number) => {
    if (nuevaCantidad <= 0) return;

    setProductos(prev => {
      const nuevosProductos = [...prev];
      const producto = nuevosProductos[index];
      const precio = producto.precio || producto.price || 0;
      const comisionPorUnidad = producto.comision || 0; // Comisión por unidad

      nuevosProductos[index] = {
        ...producto,
        cantidad: nuevaCantidad,
        subtotal: precio * nuevaCantidad,
        comision: comisionPorUnidad // Mantener la comisión por unidad
      };
      return nuevosProductos;
    });
  };

  const handleClearSearch = () => {
    setSearchProducto('');
    setSearchResults([]);
    setSearchLoading(false);
  };

  // Búsqueda de productos
  useEffect(() => {
    const searchProducts = async () => {
      if (!searchProducto.trim()) {
        setSearchResults([]);
        return;
      }

      setSearchLoading(true);
      try {
        const res = await fetch(`/api/products/search?q=${encodeURIComponent(searchProducto)}`);
        const data = await res.json();
        setSearchResults(data);
      } catch (error) {
        console.error('Error en búsqueda:', error);
        setSearchResults([]);
      } finally {
        setSearchLoading(false);
      }
    };

    const timeoutId = setTimeout(searchProducts, 300);
    return () => clearTimeout(timeoutId);
  }, [searchProducto]);

  // Recalcular totales cuando cambien los productos
  useEffect(() => {
    // Esto forzará la actualización de los cálculos cuando cambien los productos
    const total = calculateTotal();
    const subTotal = calculateSubTotal();
    const totalComision = calculateTotalComision();

    // Los valores se actualizarán automáticamente en la UI
  }, [productos]);

  const calculateTotal = () => {
    return productos.reduce((sum, producto) => {
      return sum + producto.subtotal;
    }, 0);
  };

  const calculateSubTotal = () => {
    return productos.reduce((sum, producto) => {
      return sum + producto.subtotal;
    }, 0);
  };

  const calculateTotalComision = () => {
    return productos.reduce((sum, producto) => {
      const comisionPorUnidad = producto.comision || 0;
      const cantidad = producto.cantidad || 1;
      return sum + comisionPorUnidad * cantidad;
    }, 0);
  };

  // Función para verificar si un producto es de champaña
  const isChampagneProduct = (producto: any) => {
    const categoria = (producto?.categoria || producto?.category || '').toLowerCase();
    return (
      categoria.includes('champaña') ||
      categoria.includes('shampaña') ||
      categoria.includes('champagne')
    );
  };

  // Buscar si hay algún producto de champaña (sin importar el precio)
  const hasChampagneProducts = Array.isArray(productos)
    ? productos.some(isChampagneProduct)
    : false;

  // Obtener el precio más alto de productos de champaña
  const maxChampagnePrice = Array.isArray(productos)
    ? Math.max(...productos.filter(isChampagneProduct).map(p => Number(p.precio ?? p.price ?? 0)))
    : 0;

  // Determinar el máximo de anfitrionas permitidas según las reglas (sin recargo)
  let maxAnfitrionas = 1; // Por defecto, máximo 1 anfitriona

  if (hasChampagneProducts) {
    if (maxChampagnePrice >= 240000) {
      maxAnfitrionas = 5;
    } else if (maxChampagnePrice >= 200000) {
      maxAnfitrionas = 4;
    } else if (maxChampagnePrice >= 160000) {
      maxAnfitrionas = 3;
    } else if (maxChampagnePrice >= 120000) {
      maxAnfitrionas = 2;
    } else {
      maxAnfitrionas = 1;
    }
  }

  // Limpiar anfitrionas cuando se cambia la regla de champaña
  useEffect(() => {
    if (selectedAnfitrionas.length > maxAnfitrionas) {
      setSelectedAnfitrionas(selectedAnfitrionas.slice(0, maxAnfitrionas));
      toast.info(`Se ha ajustado la selección al máximo permitido: ${maxAnfitrionas} anfitriona${maxAnfitrionas !== 1 ? 's' : ''}`);
    }
  }, [hasChampagneProducts, maxChampagnePrice, maxAnfitrionas, selectedAnfitrionas]);

  const handleSubmit = async () => {
    if (!selectedCliente || productos.length === 0) {
      toast.error('Cliente y al menos un producto son requeridos');
      return;
    }

    // Validar que el cliente no sea genérico
    const clienteSeleccionado = clientes.find(
      c => String(c.id_cliente ?? c.id ?? '') === selectedCliente
    );
    if (
      clienteSeleccionado?.nombre?.toLowerCase().includes('genérico') ||
      clienteSeleccionado?.nombre?.toLowerCase().includes('generico')
    ) {
      toast.error('No se puede seleccionar un cliente genérico');
      return;
    }

    // Validar anfitrionas cuando hay productos de champaña
    if (hasChampagneProducts && (!selectedAnfitrionas || selectedAnfitrionas.length === 0)) {
      toast.error('Debes seleccionar al menos una anfitriona cuando hay productos de champaña');
      return;
    }

    setLoading(true);
    try {
      // Calcular totales usando las funciones
      const subTotal = calculateSubTotal();
      const totalComisionFinal = calculateTotalComision();

      const total = calculateTotal();

      // Preparar detalles de cuenta
      const detalles: CreateDetalleCuentaRequest[] = productos.map(producto => ({
        producto_id: producto.id_producto || producto.id,
        precio: producto.precio,
        cantidad: producto.cantidad,
        sub_total: producto.subtotal,
        comision: producto.comision || 0
      }));

      // Datos obligatorios
      const cuentaData: CreateCuentaRequest = {
        codigo: generateCodigo(), // Código automático de 8 dígitos
        cliente_id: parseInt(selectedCliente, 10),
        total_comision: totalComisionFinal,
        sub_total: subTotal,
        total: total,
        // Datos opcionales - solo incluir si tienen valor
        ...(selectedHabitacion && { habitacion_id: parseInt(selectedHabitacion, 10) }),
        detalles,
        usuarios: selectedAnfitrionas.map(id => parseInt(id, 10))
      };

      const result = await createCuenta(cuentaData);

      // Activar temporizador si se seleccionó una habitación
      if (selectedHabitacion) {
        const habitacionSeleccionada = rooms.find(
          room => room.id.toString() === selectedHabitacion
        );
        if (habitacionSeleccionada) {
          startTimer(
            String(result.data?.cuenta_id || 0), // servicioId (usar cuenta_id para cuentas)
            String(habitacionSeleccionada.id || 0), // roomId
            habitacionSeleccionada.name, // roomName
            habitacionSeleccionada.time || 60, // duration
            `CUENTA_${result.data?.cuenta_id || Date.now()}`, // servicioCode (ID de cuenta único)
            'Cliente Cuenta', // clienteNombre (placeholder para cuentas)
            '' // anfitrionas (vacío para cuentas)
          );
        }
      }

      toast.success('Cuenta creada exitosamente');
      router.push('/accounts');
    } catch (error) {
      console.error('Error al crear cuenta:', error);
      toast.error(error instanceof Error ? error.message : 'Error al crear la cuenta');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className='flex items-center justify-between p-10 space-y-6 mt-10'>
        <div>
          <h2 className='text-2xl font-bold text-gray-900'>Datos Ticket Cuenta</h2>
          <div className='uppercase text-xs tracking-widest text-gray-400 font-semibold mb-1'>
            Las muñecas de Ramón
          </div>
        </div>

        <Button
          variant='outline'
          className='rounded-full px-6 bg-black text-white hover:scale-105 transition-all duration-200'
          onClick={() => router.back()}
        >
          <ArrowLeft />
          Atrás
        </Button>
      </div>

      <div className='p-8 bg-white ml-8 mr-8 space-y-6 shadow-md rounded-xl'>
        {/* Búsqueda de productos */}
        <div className='flex items-center justify-center gap-2 mb-4'>
          <div className='relative w-full max-w-xs'>
            <Search className='absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400' />
            <Input
              placeholder='Buscar Producto'
              value={searchProducto}
              onChange={e => setSearchProducto(e.target.value)}
              className='pl-10 pr-20 py-2 text-sm rounded-full'
              style={{ minWidth: 0 }}
            />
            <Button
              variant='outline'
              className='absolute bg-black text-white right-0 top-1/2 -translate-y-1/2 text-sm rounded-full'
              style={{ zIndex: 2 }}
            >
              Buscar
            </Button>
          </div>
          {searchProducto && (
            <Button
              variant='outline'
              size='sm'
              className='rounded-full px-4 bg-black text-white hover:scale-105 transition-all duration-200'
              onClick={handleClearSearch}
            >
              <X />
              Limpiar
            </Button>
          )}
        </div>

        {/* Tabla de resultados de búsqueda en tiempo real */}
        {searchProducto && (
          <div className='mb-6'>
            <table className='w-full border rounded-lg overflow-hidden text-sm'>
              <thead className='bg-gray-50'>
                <tr>
                  <th className='px-4 py-2 text-left'>PRODUCTO</th>
                  <th className='px-4 py-2 text-left'>PRECIO</th>
                  <th className='px-4 py-2 text-left'>COMISIÓN</th>
                  <th className='px-4 py-2 text-left'>CATEGORÍA</th>
                  <th className='px-4 py-2 text-center'>ACCIONES</th>
                </tr>
              </thead>
              <tbody>
                {searchLoading ? (
                  <tr>
                    <td colSpan={5} className='text-center py-4'>
                      Buscando...
                    </td>
                  </tr>
                ) : searchResults.length === 0 ? (
                  <tr>
                    <td colSpan={5} className='text-center py-4 text-gray-400'>
                      No hay resultados
                    </td>
                  </tr>
                ) : (
                  searchResults.map((producto, idx) => (
                    <tr
                      key={producto.id_producto || `search-prod-${idx}`}
                      className='border-t hover:bg-gray-50'
                    >
                      <td className='px-4 py-2'>
                        {producto.nombre || producto.name || producto.product_name || 'Sin nombre'}
                      </td>
                      <td className='px-4 py-2'>{formatCurrencyCLP(producto.precio)}</td>
                      <td className='px-4 py-2'>
                        {formatCurrencyCLP(producto.commission || producto.comision || 0)}
                      </td>
                      <td className='px-4 py-2'>{producto.categoria}</td>
                      <td className='px-4 py-2 text-center'>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant='ghost'
                              size='sm'
                              className='h-8 w-8 p-0 hover:bg-gray-100'
                            >
                              <span className='sr-only'>Abrir menú</span>
                              <MoreVertical className='h-4 w-4 text-gray-600' />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align='end' className='w-32'>
                            <DropdownMenuItem
                              onClick={() => handleAddProducto(producto)}
                              className='text-green-600 hover:text-green-700 hover:bg-green-50'
                            >
                              <Plus className='mr-2 h-4 w-4' />
                              Agregar
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Categorías de productos */}
        <CategoryCardList
          categorias={categoriasFiltradas}
          onSelect={handleOpenCategoria}
          center={true}
          filter={cat => cat?.estado === 1 && (cat?.productCount ?? 0) > 0}
        />

        {/* Formulario de datos */}
        <div className='grid grid-cols-3 gap-6'>
          {/* Cliente */}
          <CustomerSelect
            clientes={clientes}
            value={selectedCliente}
            onChange={setSelectedCliente}
            required
            disabled={!Array.isArray(productos) || productos.length === 0}
          />

          {/* Anfitriona */}
          <HostessSelect
            anfitrionas={anfitrionas}
            value={selectedAnfitrionas}
            onChange={setSelectedAnfitrionas}
            maxSelection={maxAnfitrionas}
            disabled={!Array.isArray(productos) || productos.length === 0}
          />

          {/* Habitación */}
          <RoomSelect
            value={selectedHabitacion}
            onChange={setSelectedHabitacion}
            disabled={loading}
            placeholder='Seleccione una habitación'
            label='Habitación'
            showPrice={true}
          />
        </div>

        {/* Mensaje informativo sobre la regla de anfitrionas */}
        {Array.isArray(productos) && productos.length > 0 && (
          <div className='w-full flex justify-center mt-2 mb-2'>
            <div
              className={`text-xs p-2 rounded-md max-w-xl w-full text-center ${hasChampagneProducts
                  ? 'bg-blue-50 text-blue-700 border border-blue-200'
                  : 'bg-orange-50 text-orange-700 border border-orange-200'
                }`}
            >
              {hasChampagneProducts ? <Wine className='mr-1 inline' /> : <Users className='mr-1 inline' />}
              {hasChampagneProducts
                ? `Champaña de ${formatCurrencyCLP(maxChampagnePrice)}: Puedes seleccionar hasta ${maxAnfitrionas} anfitriona${maxAnfitrionas !== 1 ? 's' : ''}`
                : 'Productos sin champaña: Solo puedes seleccionar 1 anfitriona máximo'}
            </div>
          </div>
        )}

        {/* Total y botón generar */}
        <div className='flex flex-col items-center justify-center'>
          <div className='text-xs text-gray-400 font-semibold mb-1'>TOTAL</div>
          <div className='text-2xl font-bold text-gray-900 mb-2 text-center justify-center items-center'>
            {formatCurrencyCLP(calculateTotal())}
          </div>
          <Button
            onClick={handleSubmit}
            disabled={
              loading ||
              !Array.isArray(productos) ||
              productos.length === 0 ||
              !selectedCliente ||
              (hasChampagneProducts && (!selectedAnfitrionas || selectedAnfitrionas.length === 0))
            }
            className='rounded-full px-6 bg-black text-white hover:scale-110 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed'
          >
            <ShoppingCart className='mr-2' />
            {loading ? 'Generando...' : 'Generar Cuenta'}
          </Button>
        </div>

        {/* Tabla de productos */}
        <div className='mt-8'>
          <div className='text-center text-gray-400 text-sm mb-2'>Detalles Producto</div>
          <div className='border rounded-lg overflow-hidden'>
            <table className='w-full'>
              <thead className='bg-gray-50'>
                <tr>
                  <th className='px-4 py-2 text-left text-sm font-medium text-gray-700'>
                    PRODUCTO
                  </th>
                  <th className='px-4 py-2 text-left text-sm font-medium text-gray-700'>
                    CANTIDAD
                  </th>
                  <th className='px-4 py-2 text-left text-sm font-medium text-gray-700'>PRECIO</th>
                  <th className='px-4 py-2 text-left text-sm font-medium text-gray-700'>
                    COMISIÓN
                  </th>
                  <th className='px-4 py-2 text-left text-sm font-medium text-gray-700'>
                    SUB TOTAL
                  </th>
                  <th className='px-4 py-2 text-left text-sm font-medium text-gray-700'>
                    ACCIONES
                  </th>
                </tr>
              </thead>
              <tbody>
                {Array.isArray(productos) &&
                  productos.map((producto, index) => (
                    <tr key={index} className='border-t'>
                      <td className='px-4 py-2'>
                        {producto.nombre || producto.name || producto.product_name || 'Sin nombre'}{' '}
                        <span className='text-xs text-gray-400 ml-2'>[{producto.categoria}]</span>
                      </td>
                      <td className='px-4 py-2'>
                        <Input
                          type='number'
                          value={producto.cantidad}
                          onChange={e =>
                            handleCantidadChangeTable(index, parseInt(e.target.value) || 0)
                          }
                          min='1'
                          className='w-20'
                        />
                      </td>
                      <td className='px-4 py-2'>
                        {formatCurrencyCLP(producto.precio || producto.price || 0)}
                      </td>
                      <td className='px-4 py-2'>
                        {formatCurrencyCLP(producto.commission || producto.comision || 0)}
                      </td>
                      <td className='px-4 py-2'>
                        {formatCurrencyCLP(producto.subtotal || 0)}
                      </td>
                      <td className='px-4 py-2'>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant='ghost'
                              size='sm'
                              className='h-8 w-8 p-0 hover:bg-gray-100'
                            >
                              <span className='sr-only'>Abrir menú</span>
                              <MoreVertical className='h-4 w-4 text-gray-600' />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align='end' className='w-32'>
                            <DropdownMenuItem
                              onClick={() => handleRemoveProducto(index)}
                              className='text-red-600 hover:text-red-700 hover:bg-red-50'
                            >
                              <Trash className='mr-2 h-4 w-4' />
                              Eliminar
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  ))}
                {(!Array.isArray(productos) || productos.length === 0) && (
                  <tr>
                    <td colSpan={6} className='px-4 py-8 text-center text-gray-500'>
                      No hay productos agregados
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Modal de productos por categoría */}
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

