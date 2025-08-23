'use client';

import { useState, useEffect } from 'react';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, DollarSign, Calendar } from 'lucide-react';
import SelectElements from '@/components/ui/select-elements';
import Paginate from '@/components/ui/paginate';

interface Advance {
  id_anticipo: number;
  monto: number;
  fecha_crea: string;
  fecha_mod: string;
  estado: number;
  motivo: string;
}

export default function GarzonAnticiposPage() {
  const { user, loading: userLoading } = useCurrentUser();
  const router = useRouter();
  const [advances, setAdvances] = useState<Advance[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortBy, setSortBy] = useState("fecha_crea");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  // Fetch anticipos
  const fetchAdvances = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/anticipos/user");
      const data = await res.json();
      if (data.success) {
        setAdvances(data.data || []);
      } else {
        console.error('Error fetching advances:', data.message);
      }
    } catch (error) {
      console.error('Error fetching advances:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user && !userLoading) {
      fetchAdvances();
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

  // Filtrado
  const filteredAdvances = advances.filter((advance) => {
    const matchesSearch = 
      advance.monto.toString().includes(searchTerm);
    const matchesStatus = statusFilter === "all" || 
      (statusFilter === "por pagar" && advance.estado === 1) ||
      (statusFilter === "pagado" && advance.estado === 0);
    
    return matchesSearch && matchesStatus;
  });

  // Ordenamiento
  const sortedAdvances = [...filteredAdvances].sort((a, b) => {
    let aValue: any = a[sortBy as keyof Advance];
    let bValue: any = b[sortBy as keyof Advance];

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
  const paginatedAdvances = sortedAdvances.slice(startIndex, endIndex);
  const totalPages = Math.ceil(sortedAdvances.length / rowsPerPage);

  // Cálculos
  const totalToPay = advances
    .filter(advance => advance.estado === 1)
    .reduce((sum, advance) => sum + (advance.monto || 0), 0);

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
          Por pagar
        </span>
      );
    } else {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-50 text-purple-700">
          Pagado
        </span>
      );
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Listado de Anticipos</h1>
          <p className="text-gray-600">Anticipos de {user?.name} {user?.lastName}</p>
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

      {/* Total a pagar centrado */}
      <div className="text-center">
        <p className="text-sm text-gray-500">TOTAL A PAGAR</p>
        <p className="text-2xl font-bold text-gray-900">
          $ {totalToPay.toLocaleString()}
        </p>
      </div>

      {/* Filtros */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Buscar
          </label>
                     <input
             type="text"
             placeholder="Buscar por monto..."
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
            <option value="por_pagar">Por pagar</option>
            <option value="pagado">Pagado</option>
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
            <option value="fecha_crea">Fecha solicitud</option>
            <option value="fecha_mod">Fecha pago</option>
            <option value="monto">Monto</option>
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
          <CardTitle>Anticipos ({filteredAdvances.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-2 text-gray-600">Cargando anticipos...</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                                 <thead>
                   <tr className="border-b border-gray-200">
                     <th className="text-left py-3 px-4 font-medium text-gray-900">#</th>
                     <th className="text-left py-3 px-4 font-medium text-gray-900">FECHA SOLICITUD</th>
                     <th className="text-left py-3 px-4 font-medium text-gray-900">FECHA PAGO</th>
                     <th className="text-left py-3 px-4 font-medium text-gray-900">MONTO</th>
                     <th className="text-left py-3 px-4 font-medium text-gray-900">ESTADO</th>
                   </tr>
                 </thead>
                <tbody>
                  {paginatedAdvances.map((advance, index) => {
                    const solicitudDate = formatDateTime(advance.fecha_crea);
                    const pagoDate = formatDateTime(advance.fecha_mod);
                    return (
                      <tr key={advance.id_anticipo} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="py-3 px-4">
                          <div className="w-8 h-8 rounded-full bg-purple-300 flex items-center justify-center text-purple-800 font-medium text-sm">
                            {startIndex + index + 1}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <div>
                            <div className="font-medium text-gray-900">{solicitudDate.date}</div>
                            <div className="text-sm text-gray-500">{solicitudDate.time}</div>
                          </div>
                        </td>
                                                 <td className="py-3 px-4">
                           {advance.fecha_mod ? (
                             <div>
                               <div className="font-medium text-gray-900">{pagoDate.date}</div>
                               <div className="text-sm text-gray-500">{pagoDate.time}</div>
                             </div>
                           ) : (
                             <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                               Por pagar
                             </span>
                           )}
                         </td>
                         <td className="py-3 px-4 text-gray-900">$ {advance.monto?.toLocaleString()}</td>
                         <td className="py-3 px-4">
                           {getStatusBadge(advance.estado)}
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
