"use client"

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { ArrowLeft, Search, ChevronUp, ChevronDown } from "lucide-react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import SelectElements from "@/components/ui/select-elements";
import Paginate from "@/components/ui/paginate";

interface Service {
  id_servicio: number;
  codigo: string;
  tiempo: string;
  fecha_crea: string;
  precio_servicio: number;
  habitacion: string;
  anfitriona: string;
  cliente: string;
  anfitrionaId: string;
  estado: number;
}

export default function AnfitrionaServiciosPage() {
  const { user, loading: userLoading } = useCurrentUser();
  const router = useRouter();
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [rowsPerPage, setRowsPerPage] = useState(5);
  const [page, setPage] = useState(1);
  const [sortField, setSortField] = useState<keyof Service>('fecha_crea');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  // Fetch servicios del usuario desde el endpoint específico
  const fetchServices = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/servicios/user");
      const data = await res.json();

      if (res.ok && data.success) {
        setServices(data.data || []);

      } else {
        console.error('API error:', data.message);
        setServices([]);
      }
    } catch (error) {
      console.error('Error fetching services:', error);
      setServices([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchServices();
  }, []);

  // Verificar que el usuario sea anfitriona - DESPUÉS de todos los hooks
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

  if (user?.role?.toLowerCase() !== 'anfitriona') {
    return (
      <div className="p-6 flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Acceso Denegado</h1>
          <p className="text-gray-600">No tienes permisos para acceder a esta página.</p>
        </div>
      </div>
    );
  }

  // Calcular totales
  const totalServices = services.length;
  const totalEarnings = services.reduce((sum, service) => sum + (service.precio_servicio || 0), 0);
  const completedServices = services.filter(service => service.estado === 1).length;

  // Ordenar y filtrar servicios
  const filteredServices = services.filter((service) => {
    if (!searchTerm) return true;
    
    try {
      const date = new Date(service.fecha_crea).toLocaleDateString('es-ES');
      return date.toLowerCase().includes(searchTerm.toLowerCase()) ||
             (service.precio_servicio || 0).toString().includes(searchTerm) ||
             (service.codigo || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
             (service.cliente || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
             (service.habitacion || '').toLowerCase().includes(searchTerm.toLowerCase());
    } catch (error) {
      return false;
    }
  });

  const sortedServices = [...filteredServices].sort((a, b) => {
    const aValue = a[sortField];
    const bValue = b[sortField];
    
    if (typeof aValue === 'string' && typeof bValue === 'string') {
      return sortDirection === 'asc' 
        ? aValue.localeCompare(bValue)
        : bValue.localeCompare(aValue);
    }
    
    if (typeof aValue === 'number' && typeof bValue === 'number') {
      return sortDirection === 'asc' ? aValue - bValue : bValue - aValue;
    }
    
    return 0;
  });

  const paginatedServices = sortedServices.slice((page - 1) * rowsPerPage, page * rowsPerPage);
  const totalPages = Math.ceil(sortedServices.length / rowsPerPage) || 1;

  const handleSort = (field: keyof Service) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const getStatusBadge = (estado: number) => {
    if (estado === 1) {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
          Completado
        </span>
      );
    } else if (estado === 2) {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
          Anulado
        </span>
      );
    } else {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
          En proceso
        </span>
      );
    }
  };

  const formatDateTime = (dateTimeString: string) => {
    try {
      const date = new Date(dateTimeString);
      const day = date.getDate();
      const month = date.toLocaleDateString('es-ES', { month: 'long' });
      const year = date.getFullYear();
      const time = date.toLocaleTimeString('es-ES', { 
        hour: '2-digit', 
        minute: '2-digit', 
        second: '2-digit' 
      });
      
      return {
        date: `${day}-${month}-${year}`,
        time: time
      };
    } catch (error) {
      console.error('Error formatting date:', dateTimeString, error);
      return { date: dateTimeString || 'N/A', time: '' };
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <p className="text-sm text-gray-500">LAS MUÑECAS DE RAMÓN</p>
          <h1 className="text-2xl font-bold text-gray-900">
            Listado de Servicios {user?.name} {user?.lastName}
          </h1>
        </div>
        <Button
          variant="outline"
          onClick={() => router.back()}
          className="flex items-center gap-2 rounded-full bg-black text-white hover:scale-105 transition-all duration-200"
        >
          <ArrowLeft className="h-4 w-4" />
          Atrás
        </Button>
      </div>

      {/* Totales centrados */}
      <div className="text-center space-y-2">
        <div className="flex justify-center gap-8">
          <div>
            <p className="text-sm text-gray-500">Total Servicios:</p>
            <p className="text-xl font-bold text-gray-900">{totalServices}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Servicios Completados:</p>
            <p className="text-xl font-bold text-gray-900">{completedServices}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Total Ganado:</p>
            <p className="text-xl font-bold text-gray-900">$ {totalEarnings.toLocaleString()}</p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <SelectElements
          value={rowsPerPage}
          onChange={(value) => {
            setRowsPerPage(value);
            setPage(1);
          }}
          options={[5, 10, 25, 50]}
          label="Listar"
        />
        
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-600">Buscar:</span>
          <Input
            type="text"
            placeholder="Buscar servicios..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-48"
          />
        </div>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <button
                      onClick={() => handleSort('id_servicio')}
                      className="flex items-center gap-1 hover:text-gray-700"
                    >
                      #
                      {sortField === 'id_servicio' ? (
                        sortDirection === 'asc' ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />
                      ) : <ChevronUp className="h-4 w-4 opacity-0" />}
                    </button>
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <button
                      onClick={() => handleSort('codigo')}
                      className="flex items-center gap-1 hover:text-gray-700"
                    >
                      CÓDIGO
                      {sortField === 'codigo' ? (
                        sortDirection === 'asc' ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />
                      ) : <ChevronUp className="h-4 w-4 opacity-0" />}
                    </button>
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <button
                      onClick={() => handleSort('cliente')}
                      className="flex items-center gap-1 hover:text-gray-700"
                    >
                      CLIENTE
                      {sortField === 'cliente' ? (
                        sortDirection === 'asc' ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />
                      ) : <ChevronUp className="h-4 w-4 opacity-0" />}
                    </button>
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <button
                      onClick={() => handleSort('tiempo')}
                      className="flex items-center gap-1 hover:text-gray-700"
                    >
                      TIEMPO
                      {sortField === 'tiempo' ? (
                        sortDirection === 'asc' ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />
                      ) : <ChevronUp className="h-4 w-4 opacity-0" />}
                    </button>
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <button
                      onClick={() => handleSort('habitacion')}
                      className="flex items-center gap-1 hover:text-gray-700"
                    >
                      HABITACIÓN
                      {sortField === 'habitacion' ? (
                        sortDirection === 'asc' ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />
                      ) : <ChevronUp className="h-4 w-4 opacity-0" />}
                    </button>
                  </th>
                                     <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                     <button
                       onClick={() => handleSort('precio_servicio')}
                       className="flex items-center gap-1 hover:text-gray-700"
                     >
                       PRECIO
                       {sortField === 'precio_servicio' ? (
                         sortDirection === 'asc' ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />
                       ) : <ChevronUp className="h-4 w-4 opacity-0" />}
                     </button>
                   </th>
                   <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                     <button
                       onClick={() => handleSort('fecha_crea')}
                       className="flex items-center gap-1 hover:text-gray-700"
                     >
                       FECHA HORA
                       {sortField === 'fecha_crea' ? (
                         sortDirection === 'asc' ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />
                       ) : <ChevronUp className="h-4 w-4 opacity-0" />}
                     </button>
                   </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <button
                      onClick={() => handleSort('estado')}
                      className="flex items-center gap-1 hover:text-gray-700"
                    >
                      ESTADO
                      {sortField === 'estado' ? (
                        sortDirection === 'asc' ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />
                      ) : <ChevronUp className="h-4 w-4 opacity-0" />}
                    </button>
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {loading ? (
                  <tr>
                    <td colSpan={8} className="px-6 py-4 text-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                      <p className="mt-2 text-gray-600">Cargando servicios...</p>
                    </td>
                  </tr>
                ) : paginatedServices.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-6 py-4 text-center text-gray-500">
                      No se encontraron servicios
                    </td>
                  </tr>
                ) : (
                  paginatedServices.map((service, index) => {
                    return (
                      <tr key={service.id_servicio} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="w-8 h-8 bg-purple-300 text-white rounded-full flex items-center justify-center text-sm font-medium">
                            {(page - 1) * rowsPerPage + index + 1}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {service.codigo || 'N/A'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {service.cliente || 'N/A'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {service.tiempo || 'N/A'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {service.habitacion || 'N/A'}
                        </td>
                                                 <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                           $ {(service.precio_servicio || 0).toLocaleString()}
                         </td>
                                                   <td className="px-6 py-4 whitespace-nowrap">
                            <div>
                              <div className="text-sm font-medium text-gray-900">
                                {formatDateTime(service.fecha_crea).date}
                              </div>
                              <div className="text-sm text-gray-500">
                                {formatDateTime(service.fecha_crea).time}
                              </div>
                            </div>
                          </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {getStatusBadge(service.estado)}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Pagination */}
      <div className="flex justify-center">
        <Paginate
          page={page}
          totalPages={totalPages}
          setPage={setPage}
        />
      </div>
    </div>
  );
}
