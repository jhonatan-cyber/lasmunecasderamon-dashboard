'use client';

import { useState, useEffect } from 'react';
import { useCurrentUser } from '@/hooks/auth/useCurrentUser';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Clock, DollarSign } from 'lucide-react';
import SelectElements from '@/components/ui/select-elements';
import Paginate from '@/components/ui/paginate';

interface Overtime {
  id_horas_extras?: number;
  fecha_crea: string;
  fecha_mod: string;
  hora: number;
  total: number;
  estado: number;
  usuario_id: number;
}

export default function CajeroHorasExtrasPage() {
  const { user, loading: userLoading } = useCurrentUser();
  const router = useRouter();
  const [overtime, setOvertime] = useState<Overtime[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortBy, setSortBy] = useState("fecha_crea");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  // Fetch horas extras
  const fetchOvertime = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/overtime/user");
      const data = await res.json();
      if (data.success) {
        setOvertime(data.data || []);
      } else {
        console.error('Error fetching overtime:', data.message);
      }
    } catch (error) {
      console.error('Error fetching overtime:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user && !userLoading) {
      fetchOvertime();
    }
  }, [user, userLoading]);

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

  // Verificar que el usuario sea cajero
  if (user?.role?.toLowerCase() !== 'cajero') {
    return (
      <div className="p-6 flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Acceso Denegado</h1>
          <p className="text-gray-600">No tienes permisos para acceder a esta página.</p>
        </div>
      </div>
    );
  }

  // Filtrado
  const filteredOvertime = overtime.filter((item) => {
    const matchesSearch = 
      item.total.toString().includes(searchTerm) ||
      item.hora.toString().includes(searchTerm);
    const matchesStatus = statusFilter === "all" || 
      (statusFilter === "por_cobrar" && item.estado === 1) ||
      (statusFilter === "cobrado" && item.estado === 0);
    
    return matchesSearch && matchesStatus;
  });

  // Ordenamiento
  const sortedOvertime = [...filteredOvertime].sort((a, b) => {
    let aValue: any = a[sortBy as keyof Overtime];
    let bValue: any = b[sortBy as keyof Overtime];

    if (sortBy === "fecha_crea" || sortBy === "fecha_mod") {
      aValue = new Date(aValue || 0);
      bValue = new Date(bValue || 0);
    }

    if (sortOrder === "asc") {
      return aValue > bValue ? 1 : -1;
    } else {
      return aValue < bValue ? 1 : -1;
    }
  });

  // Paginación
  const startIndex = (currentPage - 1) * rowsPerPage;
  const endIndex = startIndex + rowsPerPage;
  const paginatedOvertime = sortedOvertime.slice(startIndex, endIndex);
  const totalPages = Math.ceil(sortedOvertime.length / rowsPerPage);

  // Cálculos
  const totalToCollect = overtime
    .filter(item => item.estado === 1)
    .reduce((sum, item) => sum + (item.total || 0), 0);

  const totalHours = overtime
    .filter(item => item.estado === 1)
    .reduce((sum, item) => sum + (item.hora || 0), 0);

  // Formatear fecha
  const formatDateTime = (dateString: string) => {
    if (!dateString) return { date: "N/A", time: "N/A" };
    
    const date = new Date(dateString);
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
  };

  // Obtener badge de estado
  const getStatusBadge = (estado: number) => {
    if (estado === 1) {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
          Por cobrar
        </span>
      );
    } else {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-50 text-purple-700">
          Cobrado
        </span>
      );
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Listado de Horas Extras</h1>
          <p className="text-gray-600">Horas extras de {user?.name} {user?.lastName}</p>
        </div>
        <Button
          variant="outline"
          onClick={() => router.back()}
          className="rounded-full bg-black text-white hover:scale-105 transition-all duration-200"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Atrás
        </Button>
      </div>

      {/* Totales centrados */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="text-center">
          <p className="text-sm text-gray-500">TOTAL A COBRAR</p>
          <p className="text-2xl font-bold text-gray-900">
            $ {totalToCollect.toLocaleString()}
          </p>
        </div>
        <div className="text-center">
          <p className="text-sm text-gray-500">TOTAL HORAS</p>
          <p className="text-2xl font-bold text-gray-900">
            {totalHours.toFixed(1)} hrs
          </p>
        </div>
      </div>

      {/* Filtros */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Buscar
          </label>
          <input
            type="text"
            placeholder="Buscar por monto o horas..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Estado
          </label>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">Todos</option>
            <option value="por_cobrar">Por cobrar</option>
            <option value="cobrado">Cobrado</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Ordenar por
          </label>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="fecha_crea">Fecha creación</option>
            <option value="fecha_mod">Fecha pago</option>
            <option value="total">Monto</option>
            <option value="hora">Horas</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Orden
          </label>
          <select
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value as "asc" | "desc")}
            className="w-full px-3 py-2 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="desc">Descendente</option>
            <option value="asc">Ascendente</option>
          </select>
        </div>
      </div>

      {/* Selector de filas por página */}
      <div className="flex justify-between items-center">
        <SelectElements
          value={rowsPerPage}
          onChange={(value) => {
            setRowsPerPage(value);
            setCurrentPage(1);
          }}
          options={[
            { value: 5, label: "5 por página" },
            { value: 10, label: "10 por página" },
            { value: 20, label: "20 por página" },
            { value: 50, label: "50 por página" },
          ]}
        />
      </div>

      {/* Tabla */}
      <Card>
        <CardHeader>
          <CardTitle>Horas Extras ({filteredOvertime.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-2 text-gray-600">Cargando horas extras...</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                                 <thead>
                   <tr className="border-b border-gray-200">
                     <th className="text-left py-3 px-4 font-medium text-gray-900">#</th>
                     <th className="text-left py-3 px-4 font-medium text-gray-900">FECHA CREACIÓN</th>
                     <th className="text-left py-3 px-4 font-medium text-gray-900">FECHA PAGO</th>
                     <th className="text-left py-3 px-4 font-medium text-gray-900">HORAS</th>
                     <th className="text-left py-3 px-4 font-medium text-gray-900">MONTO</th>
                     <th className="text-left py-3 px-4 font-medium text-gray-900">ESTADO</th>
                   </tr>
                 </thead>
                <tbody>
                  {paginatedOvertime.map((item, index) => {
                    const creacionDate = formatDateTime(item.fecha_crea);
                    const pagoDate = formatDateTime(item.fecha_mod);
                    return (
                      <tr key={`${item.id_horas_extras || index}`} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="py-3 px-4">
                          <div className="w-8 h-8 rounded-full bg-purple-300 flex items-center justify-center text-purple-800 font-medium text-sm">
                            {startIndex + index + 1}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <div>
                            <div className="font-medium text-gray-900">{creacionDate.date}</div>
                            <div className="text-sm text-gray-500">{creacionDate.time}</div>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          {item.fecha_mod ? (
                            <div>
                              <div className="font-medium text-gray-900">{pagoDate.date}</div>
                              <div className="text-sm text-gray-500">{pagoDate.time}</div>
                            </div>
                          ) : (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                              Por cobrar
                            </span>
                          )}
                        </td>
                                                 <td className="py-3 px-4 text-gray-900">{item.hora?.toFixed(1)} hrs</td>
                         <td className="py-3 px-4 text-gray-900">$ {item.total?.toLocaleString()}</td>
                         <td className="py-3 px-4">
                           {getStatusBadge(item.estado)}
                         </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Paginación */}
      {totalPages > 1 && (
        <div className="flex justify-center">
          <Paginate
            page={currentPage}
            totalPages={totalPages}
            setPage={setCurrentPage}
          />
        </div>
      )}
    </div>
  );
}
