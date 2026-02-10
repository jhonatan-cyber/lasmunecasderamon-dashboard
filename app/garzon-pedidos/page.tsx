'use client';

import { useState, useEffect } from "react";
import { useCurrentUser } from "@/hooks/auth/useCurrentUser";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Search, Filter } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import SelectElements from "@/components/ui/select-elements";
import Paginate from "@/components/ui/paginate";

interface Order {
  id_pedido: number;
  cliente: string;
  codigo: string;
  garzon: string;
  nicks: string;
  subtotal: number;
  total: number;
  estado: number;
}

export default function GarzonPedidosPage() {
  const { user, loading: userLoading } = useCurrentUser();
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [filteredOrders, setFilteredOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortBy, setSortBy] = useState("total");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  // Fetch pedidos del usuario
  const fetchOrders = async () => {
    // Solo mostrar loading en la primera carga
    if (orders.length === 0) {
      setLoading(true);
    }
    
    try {
      const response = await fetch("/api/orders/user");
      const data = await response.json();
      
      if (data.success) {
        setOrders(data.data || []);
        console.log('✅ Pedidos actualizados:', data.data?.length || 0);
      } else {
        console.error('Error fetching orders:', data.message);
      }
    } catch (error) {
      console.error('Error fetching orders:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user && !userLoading) {
      console.log('🔄 Iniciando carga de pedidos para usuario:', user.id);
      fetchOrders();
      
      // Actualización automática cada 3 segundos
      const interval = setInterval(() => {
        fetchOrders();
      }, 3000);
      
      return () => {
        clearInterval(interval);
      };
    }
  }, [user, userLoading]);

  // Filtrar y ordenar pedidos
  useEffect(() => {
    let filtered = [...orders];

    // Filtrar por búsqueda
    if (searchTerm) {
      filtered = filtered.filter(order => 
        order.cliente?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.codigo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.nicks?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Filtrar por estado
    if (statusFilter !== "all") {
      filtered = filtered.filter(order => order.estado === parseInt(statusFilter));
    }

    // Ordenar
    filtered.sort((a, b) => {
      let aValue: any = a[sortBy as keyof Order];
      let bValue: any = b[sortBy as keyof Order];

      if (sortBy === "total" || sortBy === "subtotal") {
        aValue = parseFloat(aValue) || 0;
        bValue = parseFloat(bValue) || 0;
      }

      if (sortOrder === "asc") {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

    setFilteredOrders(filtered);
    setCurrentPage(1);
  }, [orders, searchTerm, statusFilter, sortBy, sortOrder]);

  // Calcular paginación
  const totalPages = Math.ceil(filteredOrders.length / rowsPerPage);
  const startIndex = (currentPage - 1) * rowsPerPage;
  const endIndex = startIndex + rowsPerPage;
  const currentOrders = filteredOrders.slice(startIndex, endIndex);

  // Calcular totales
  const totalOrders = orders.length;
  const totalAmount = orders.reduce((sum, order) => sum + (order.total || 0), 0);
  const pendingOrders = orders.filter(order => order.estado === 1).length;
  const approvedOrders = orders.filter(order => order.estado === 0).length;
  const rejectedOrders = orders.filter(order => order.estado === 2).length;



  // Obtener badge de estado
  const getStatusBadge = (estado: number) => {
    switch (estado) {
      case 1:
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
            Pendiente
          </span>
        );
      case 0:
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
            Aprobado
          </span>
        );
      case 2:
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
            Rechazado
          </span>
        );
      case 3:
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
            Cancelado
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
            Desconocido
          </span>
        );
    }
  };

  if (userLoading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Cargando...</p>
        </div>
      </div>
    );
  }

  // Verificar que el usuario sea garzon
  if (user?.role?.toLowerCase() !== 'garzon') {
    return (
      <div className="p-6 flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Acceso Denegado</h1>
          <p className="text-gray-600">No tienes permisos para acceder a esta página.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Listado de Pedidos</h1>
          <p className="text-gray-600">Pedidos realizados por {user?.name} {user?.lastName}</p>
        </div>
        <Button 
          onClick={() => router.back()}
          variant="outline"
          className="rounded-full bg-black text-white hover:scale-105 transition-all duration-200"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Atrás
        </Button>
      </div>

      {/* Total a Cobrar centrado */}
      <div className="text-center">
        <p className="text-sm text-gray-500">TOTAL GANADO</p>
        <p className="text-2xl font-bold text-gray-900">
          {loading ? (
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-900 mx-auto"></div>
          ) : (
            `$ ${totalAmount.toLocaleString()}`
          )}
        </p>
      </div>

      {/* Estadísticas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-blue-600">{totalOrders}</p>
              <p className="text-sm text-gray-600">Total Pedidos</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-yellow-600">{pendingOrders}</p>
              <p className="text-sm text-gray-600">Pendientes</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-green-600">{approvedOrders}</p>
              <p className="text-sm text-gray-600">Aprobados</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-red-600">{rejectedOrders}</p>
              <p className="text-sm text-gray-600">Rechazados</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filtros
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Buscar
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                                 <Input
                   placeholder="Buscar por cliente, código, nicks..."
                   value={searchTerm}
                   onChange={(e) => setSearchTerm(e.target.value)}
                   className="pl-10"
                 />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Estado
              </label>
                             <Select value={statusFilter} onValueChange={setStatusFilter}>
                 <SelectTrigger>
                   <SelectValue placeholder="Todos los estados" />
                 </SelectTrigger>
                 <SelectContent>
                   <SelectItem value="all">Todos</SelectItem>
                   <SelectItem value="1">Pendiente</SelectItem>
                   <SelectItem value="0">Aprobado</SelectItem>
                   <SelectItem value="2">Rechazado</SelectItem>
                   <SelectItem value="3">Cancelado</SelectItem>
                 </SelectContent>
               </Select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Ordenar por
              </label>
                             <Select value={sortBy} onValueChange={setSortBy}>
                 <SelectTrigger>
                   <SelectValue />
                 </SelectTrigger>
                 <SelectContent>
                   <SelectItem value="total">Total</SelectItem>
                   <SelectItem value="subtotal">Subtotal</SelectItem>
                   <SelectItem value="cliente">Cliente</SelectItem>
                   <SelectItem value="codigo">Código</SelectItem>
                 </SelectContent>
               </Select>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}
            >
              {sortOrder === "asc" ? "↑" : "↓"} Orden
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Tabla */}
      <Card>
        <CardHeader>
          <CardTitle>Pedidos ({filteredOrders.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <span className="ml-2">Cargando pedidos...</span>
            </div>
          ) : currentOrders.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No se encontraron pedidos
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                                 <thead className="bg-gray-50">
                   <tr>
                     <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                       #
                     </th>
                     <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                       CÓDIGO
                     </th>
                     <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                       CLIENTE
                     </th>
                     <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                       GARZÓN
                     </th>
                     <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                       NICKS
                     </th>
                     <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                       SUBTOTAL
                     </th>
                     <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                       TOTAL
                     </th>
                     <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                       ESTADO
                     </th>
                   </tr>
                 </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {currentOrders.map((order, index) => (
                                         <tr key={order.id_pedido} className="hover:bg-gray-50">
                       <td className="px-6 py-4 whitespace-nowrap">
                         <div className="flex items-center justify-center w-8 h-8 rounded-full bg-purple-300 text-purple-800 font-semibold text-sm">
                           {startIndex + index + 1}
                         </div>
                       </td>
                       <td className="px-6 py-4 whitespace-nowrap">
                         <div className="text-sm font-medium text-gray-900">
                           {order.codigo || 'N/A'}
                         </div>
                       </td>
                       <td className="px-6 py-4 whitespace-nowrap">
                         <div className="text-sm font-medium text-gray-900">
                           {order.cliente || 'N/A'}
                         </div>
                       </td>
                       <td className="px-6 py-4 whitespace-nowrap">
                         <div className="text-sm text-gray-900">
                           {order.garzon || 'N/A'}
                         </div>
                       </td>
                       <td className="px-6 py-4 whitespace-nowrap">
                         <div className="text-sm text-gray-900">
                           {order.nicks || 'N/A'}
                         </div>
                       </td>
                       <td className="px-6 py-4 whitespace-nowrap">
                         <div className="text-sm font-medium text-gray-900">
                           $ {order.subtotal?.toLocaleString()}
                         </div>
                       </td>
                       <td className="px-6 py-4 whitespace-nowrap">
                         <div className="text-sm font-medium text-gray-900">
                           $ {order.total?.toLocaleString()}
                         </div>
                       </td>
                       <td className="px-6 py-4 whitespace-nowrap">
                         {getStatusBadge(order.estado)}
                       </td>
                     </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Paginación */}
      {filteredOrders.length > 0 && (
        <div className="flex items-center justify-between">
                     <div className="flex items-center space-x-2">
             <span className="text-sm text-gray-700">Mostrar</span>
             <SelectElements
               value={rowsPerPage}
               onChange={(value) => {
                 setRowsPerPage(value);
                 setCurrentPage(1);
               }}
               options={[5, 10, 20, 50]}
             />
             <span className="text-sm text-gray-700">por página</span>
           </div>
           
           <div className="flex justify-center flex-1">
             <Paginate
               page={currentPage}
               totalPages={totalPages}
               setPage={setCurrentPage}
             />
           </div>
        </div>
      )}
    </div>
  );
}
