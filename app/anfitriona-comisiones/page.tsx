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

interface Commission {
  id_comision: number;
  codigo: string;
  comision: number;
  fecha_crea: string;
  fecha_mod: string;
  estado: number;
}

export default function AnfitrionaComisionesPage() {
  const { user, loading: userLoading } = useCurrentUser();
  const router = useRouter();
  const [commissions, setCommissions] = useState<Commission[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [rowsPerPage, setRowsPerPage] = useState(5);
  const [page, setPage] = useState(1);
  const [sortField, setSortField] = useState<keyof Commission>('fecha_crea');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  // Fetch comisiones del usuario desde el endpoint específico
  const fetchCommissions = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/commissions/user");
      const data = await res.json();

      if (res.ok && data.success) {
        setCommissions(data.data || []);

      } else {
        console.error('API error:', data.message);
        setCommissions([]);
      }
    } catch (error) {
      console.error('Error fetching commissions:', error);
      setCommissions([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCommissions();
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
  const totalCommissions = commissions.length;
  const totalAmount = commissions.reduce((sum, commission) => sum + (commission.comision || 0), 0);
  const pendingCommissions = commissions.filter(commission => commission.estado === 1).length;
  const totalPending = commissions.filter(commission => commission.estado === 1).reduce((sum, commission) => sum + (commission.comision || 0), 0);

  // Ordenar y filtrar comisiones
  const filteredCommissions = commissions.filter((commission) => {
    if (!searchTerm) return true;
    
    try {
      const date = new Date(commission.fecha_crea).toLocaleDateString('es-ES');
      return date.toLowerCase().includes(searchTerm.toLowerCase()) ||
             (commission.comision || 0).toString().includes(searchTerm) ||
             (commission.codigo || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
             (commission.id_comision || '').toString().includes(searchTerm);
    } catch (error) {
      return false;
    }
  });

  const sortedCommissions = [...filteredCommissions].sort((a, b) => {
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

  const paginatedCommissions = sortedCommissions.slice((page - 1) * rowsPerPage, page * rowsPerPage);
  const totalPages = Math.ceil(sortedCommissions.length / rowsPerPage) || 1;

  const handleSort = (field: keyof Commission) => {
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
            Listado de Comisiones {user?.name} {user?.lastName}
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
            <p className="text-sm text-gray-500">Total Comisiones:</p>
            <p className="text-xl font-bold text-gray-900">{totalCommissions}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Comisiones Pendientes:</p>
            <p className="text-xl font-bold text-gray-900">{pendingCommissions}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Total Ganado:</p>
            <p className="text-xl font-bold text-gray-900">$ {totalAmount.toLocaleString()}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Por Cobrar:</p>
            <p className="text-xl font-bold text-gray-900">$ {totalPending.toLocaleString()}</p>
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
            placeholder="Buscar comisiones..."
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
                      onClick={() => handleSort('id_comision')}
                      className="flex items-center gap-1 hover:text-gray-700"
                    >
                      #
                      {sortField === 'id_comision' ? (
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
                      onClick={() => handleSort('comision')}
                      className="flex items-center gap-1 hover:text-gray-700"
                    >
                      COMISIÓN
                      {sortField === 'comision' ? (
                        sortDirection === 'asc' ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />
                      ) : <ChevronUp className="h-4 w-4 opacity-0" />}
                    </button>
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <button
                      onClick={() => handleSort('fecha_crea')}
                      className="flex items-center gap-1 hover:text-gray-700"
                    >
                      FECHA CREACIÓN
                      {sortField === 'fecha_crea' ? (
                        sortDirection === 'asc' ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />
                      ) : <ChevronUp className="h-4 w-4 opacity-0" />}
                    </button>
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    FECHA MODIFICACIÓN
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
                    <td colSpan={6} className="px-6 py-4 text-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                      <p className="mt-2 text-gray-600">Cargando comisiones...</p>
                    </td>
                  </tr>
                ) : paginatedCommissions.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-4 text-center text-gray-500">
                      No se encontraron comisiones
                    </td>
                  </tr>
                ) : (
                  paginatedCommissions.map((commission, index) => {
                    return (
                      <tr key={commission.id_comision} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="w-8 h-8 bg-purple-300 text-white rounded-full flex items-center justify-center text-sm font-medium">
                            {(page - 1) * rowsPerPage + index + 1}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {commission.codigo || 'N/A'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          $ {(commission.comision || 0).toLocaleString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {formatDateTime(commission.fecha_crea).date}
                            </div>
                            <div className="text-sm text-gray-500">
                              {formatDateTime(commission.fecha_crea).time}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {commission.fecha_mod ? (
                            <div>
                              <div className="text-sm font-medium text-gray-900">
                                {formatDateTime(commission.fecha_mod).date}
                              </div>
                              <div className="text-sm text-gray-500">
                                {formatDateTime(commission.fecha_mod).time}
                              </div>
                            </div>
                          ) : (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                              Por cobrar
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {getStatusBadge(commission.estado)}
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
