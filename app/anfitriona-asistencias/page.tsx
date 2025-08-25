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

interface Attendance {
  id_asistencia: number;
  fecha: string;
  hora: string;
  sueldo: number;
  aporte: number;
  total: number;
  fecha_pago: string;
  estado: number;
}

export default function AnfitrionaAsistenciasPage() {
  const { user, loading: userLoading } = useCurrentUser();
  const router = useRouter();
  const [attendances, setAttendances] = useState<Attendance[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [rowsPerPage, setRowsPerPage] = useState(5);
  const [page, setPage] = useState(1);
  const [sortField, setSortField] = useState<keyof Attendance>('fecha');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  // Fetch asistencias del usuario desde el endpoint específico
  const fetchAttendances = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/asistencias/user");
      const data = await res.json();

      if (res.ok && data.success) {
        setAttendances(data.data || []);

      } else {
        console.error('API error:', data.message);
        setAttendances([]);
      }
    } catch (error) {
      console.error('Error fetching attendances:', error);
      setAttendances([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAttendances();
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
  const totalSalary = attendances.reduce((sum, attendance) => sum + (attendance.sueldo || 0), 0);
  const totalContribution = attendances.reduce((sum, attendance) => sum + (attendance.aporte || 0), 0);
  const totalToCollect = totalSalary - totalContribution;

  // Ordenar y filtrar asistencias
  const filteredAttendances = attendances.filter((attendance) => {
    if (!searchTerm) return true;
    
    try {
      const date = new Date(attendance.fecha).toLocaleDateString('es-ES');
      return date.toLowerCase().includes(searchTerm.toLowerCase()) ||
             (attendance.sueldo || 0).toString().includes(searchTerm) ||
             (attendance.total || 0).toString().includes(searchTerm);
    } catch (error) {
      return false;
    }
  });

  const sortedAttendances = [...filteredAttendances].sort((a, b) => {
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

  const paginatedAttendances = sortedAttendances.slice((page - 1) * rowsPerPage, page * rowsPerPage);
  const totalPages = Math.ceil(sortedAttendances.length / rowsPerPage) || 1;

  const handleSort = (field: keyof Attendance) => {
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

  const getPaymentDateBadge = (fechaPago: string | null, estado: number) => {
    if (!fechaPago || estado === 1) {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
          Por cobrar
        </span>
      );
    } else {
      return (
        <div className="text-sm text-gray-900">
          {formatDateTime(fechaPago).date}
        </div>
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
            Listado de Asistencia {user?.name} {user?.lastName}
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
            <p className="text-sm text-gray-500">Total Sueldo:</p>
            <p className="text-xl font-bold text-gray-900">$ {totalSalary.toLocaleString()}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Total Aporte:</p>
            <p className="text-xl font-bold text-gray-900">$ {totalContribution.toLocaleString()}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Total a cobrar:</p>
            <p className="text-xl font-bold text-gray-900">$ {totalToCollect.toLocaleString()}</p>
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
            placeholder="Buscar asistencias..."
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
                      onClick={() => handleSort('id_asistencia')}
                      className="flex items-center gap-1 hover:text-gray-700"
                    >
                      #
                      {sortField === 'id_asistencia' ? (
                        sortDirection === 'asc' ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />
                      ) : <ChevronUp className="h-4 w-4 opacity-0" />}
                    </button>
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <button
                      onClick={() => handleSort('fecha')}
                      className="flex items-center gap-1 hover:text-gray-700"
                    >
                      FECHA
                      {sortField === 'fecha' ? (
                        sortDirection === 'asc' ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />
                      ) : <ChevronUp className="h-4 w-4 opacity-0" />}
                    </button>
                  </th>

                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <button
                      onClick={() => handleSort('sueldo')}
                      className="flex items-center gap-1 hover:text-gray-700"
                    >
                      SUELDO
                      {sortField === 'sueldo' ? (
                        sortDirection === 'asc' ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />
                      ) : <ChevronUp className="h-4 w-4 opacity-0" />}
                    </button>
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <button
                      onClick={() => handleSort('aporte')}
                      className="flex items-center gap-1 hover:text-gray-700"
                    >
                      APORTE
                      {sortField === 'aporte' ? (
                        sortDirection === 'asc' ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />
                      ) : <ChevronUp className="h-4 w-4 opacity-0" />}
                    </button>
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <button
                      onClick={() => handleSort('total')}
                      className="flex items-center gap-1 hover:text-gray-700"
                    >
                      TOTAL
                      {sortField === 'total' ? (
                        sortDirection === 'asc' ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />
                      ) : <ChevronUp className="h-4 w-4 opacity-0" />}
                    </button>
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    FECHA DE PAGO
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
                    <td colSpan={7} className="px-6 py-4 text-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                      <p className="mt-2 text-gray-600">Cargando asistencias...</p>
                    </td>
                  </tr>
                ) : paginatedAttendances.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-4 text-center text-gray-500">
                      No se encontraron asistencias
                    </td>
                  </tr>
                ) : (
                  paginatedAttendances.map((attendance, index) => {
                    return (
                      <tr key={attendance.id_asistencia} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="w-8 h-8 bg-purple-300 text-white rounded-full flex items-center justify-center text-sm font-medium">
                            {(page - 1) * rowsPerPage + index + 1}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {formatDateTime(attendance.fecha).date}
                            </div>
                            <div className="text-sm text-gray-500">
                              {attendance.hora || 'N/A'}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          $ {(attendance.sueldo || 0).toLocaleString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          $ {(attendance.aporte || 0).toLocaleString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          $ {(attendance.total || 0).toLocaleString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {getPaymentDateBadge(attendance.fecha_pago, attendance.estado)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {getStatusBadge(attendance.estado)}
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
