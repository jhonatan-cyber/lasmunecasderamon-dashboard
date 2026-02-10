'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useOvertime } from '@/hooks/personal/useOvertime';
import { Card, CardContent } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { formatCurrencyNoDecimals } from '@/lib/formatters';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Clock, Calendar, DollarSign } from 'lucide-react';
import SelectElements from '@/components/ui/select-elements';
import Paginate from '@/components/ui/paginate';

interface OvertimeDetail {
  fecha_crea: string;
  fecha_mod: string | null;
  usuario: string;
  hora: number;
  monto: number;
  total: number;
  estado: number;
}

interface OvertimeDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: number;
  userName: string;
}

export default function OvertimeDetailModal({
  isOpen,
  onClose,
  userId,
  userName
}: OvertimeDetailModalProps) {
  const { 
    getOvertimeDetails, 
    overtimeDetails: details,
    detailsLoading: loading,
    detailsError: error 
  } = useOvertime();

  // Estado para paginación
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(5);

  useEffect(() => {
    if (isOpen && userId) {
      console.log('=== MODAL: Abriendo modal para userId:', userId);
      getOvertimeDetails(userId).catch(console.error);
    }
  }, [isOpen, userId]);

  // Logs para debugging
  console.log('=== MODAL: Estado actual ===');
  console.log('Loading:', loading);
  console.log('Error:', error);
  console.log('Details length:', details.length);
  console.log('Details:', details);
  console.log('Details tipo:', typeof details);
  console.log('Details es array:', Array.isArray(details));
  console.log('Details contenido completo:', JSON.stringify(details, null, 2));

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return format(date, "d 'de' MMMM 'de' yyyy", { locale: es });
  };

  const formatTime = (hours: number) => {
    return `${hours} hrs`;
  };

  const getStatusBadge = (estado: number) => {
    switch (estado) {
      case 1:
        return <Badge className="bg-green-100 text-green-800">Por pagar</Badge>;
      case 0:
        return <Badge className="bg-yellow-100 text-yellow-800">Pagado</Badge>;
      default:
        return <Badge className="bg-gray-100 text-gray-800">Sin definir</Badge>;
    }
  };

  const calculateTotals = () => {
    return details.reduce(
      (acc, detail) => ({
        totalHoras: acc.totalHoras + detail.hora,
        totalMonto: acc.totalMonto + detail.total,
      }),
      { totalHoras: 0, totalMonto: 0 }
    );
  };

  const { totalHoras, totalMonto } = calculateTotals();

  // Lógica de paginación
  const totalPages = Math.ceil(details.length / rowsPerPage);
  const startIndex = (currentPage - 1) * rowsPerPage;
  const endIndex = startIndex + rowsPerPage;
  const paginatedDetails = details.slice(startIndex, endIndex);

  // Resetear página cuando cambian los datos
  useEffect(() => {
    setCurrentPage(1);
  }, [details.length]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col p-0">
        <DialogHeader className="flex-shrink-0 px-6 pt-6 pb-4 border-b">
          <DialogTitle className="text-xl font-bold">
            Detalle de Horas Extras
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-6 py-4">

        <div className="space-y-6">
          {/* Card de resumen */}
          <Card>
            <CardContent className="p-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Información del Usuario */}
                <div className="flex flex-col space-y-2">
                  <h4 className="text-sm font-medium text-gray-500 uppercase tracking-wide">
                    Información del Usuario
                  </h4>
                  <div className="space-y-1">
                    <div className="text-lg font-semibold text-gray-900">
                      {userName}
                    </div>
                  </div>
                </div>

                {/* Resumen de Totales */}
                <div className="flex flex-col space-y-2">
                  <h4 className="text-sm font-medium text-gray-500 uppercase tracking-wide">
                    Resumen de Horas Extras
                  </h4>
                  <div className="space-y-3">
                    <div className="flex items-center">
                      <Clock className="h-4 w-4 text-gray-400 mr-2" />
                      <span className="text-sm text-gray-600">Total Horas:</span>
                      <span className="text-lg font-bold text-blue-600 ml-2">
                        {formatTime(totalHoras)}
                      </span>
                    </div>
                    <div className="flex items-center">
                      <DollarSign className="h-4 w-4 text-gray-400 mr-2" />
                      <span className="text-sm text-gray-600">Total a Pagar:</span>
                      <span className="text-lg font-bold text-green-600 ml-2">
                        {formatCurrencyNoDecimals(totalMonto)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Lista de horas extras */}
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-2 text-sm text-gray-600">
                Cargando detalles...
              </p>
            </div>
          ) : error ? (
            <Card>
              <CardContent className="p-4">
                <p className="text-red-600 text-sm">{error}</p>
              </CardContent>
            </Card>
          ) : details.length === 0 ? (
            <Card>
              <CardContent className="p-4 text-center">
                <p className="text-gray-500 text-sm">
                  No hay registros de horas extras
                </p>
              </CardContent>
            </Card>
                     ) : (
             <>
                               {/* Controles de paginación */}
                <div className="flex justify-end items-center mb-4">
                  <SelectElements
                    rowsPerPage={rowsPerPage}
                    setRowsPerPage={setRowsPerPage}
                    setPage={setCurrentPage}
                    options={[5, 10, 20, 40]}
                    label="Elementos por página"
                  />
                </div>

               {/* Vista móvil */}
               <div className="lg:hidden space-y-4">
                 {paginatedDetails.map((detail, index) => (
                  <Card key={index} className="shadow-sm">
                    <CardContent className="p-4">
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Calendar className="text-gray-500 w-4" />
                            <span className="font-medium text-sm">
                              {formatDate(detail.fecha_crea)}
                            </span>
                          </div>
                          {getStatusBadge(detail.estado)}
                        </div>

                        <div className="flex items-center gap-2">
                          <Clock className="text-gray-500 w-4" />
                          <span className="text-sm text-gray-600">
                            {formatTime(detail.hora)}
                          </span>
                        </div>

                        <div className="flex items-center gap-2 pt-2 border-t border-gray-100">
                          <DollarSign className="text-green-500 w-4" />
                          <span className="text-sm font-semibold text-green-600">
                            {formatCurrencyNoDecimals(detail.total)}
                          </span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

                             {/* Vista desktop */}
               <div className="hidden lg:block">
                 <div className="rounded-md border">
                   <Table>
                     <TableHeader>
                       <TableRow>
                         <TableHead className="text-left">Fecha</TableHead>
                         <TableHead className="text-center">Horas</TableHead>
                         <TableHead className="text-center">Monto</TableHead>
                         <TableHead className="text-center">Total</TableHead>
                         <TableHead className="text-center">Estado</TableHead>
                       </TableRow>
                     </TableHeader>
                     <TableBody>
                       {paginatedDetails.map((detail, index) => (
                        <TableRow key={index}>
                          <TableCell className="font-medium">
                            {formatDate(detail.fecha_crea)}
                          </TableCell>
                          <TableCell className="text-center">
                            {formatTime(detail.hora)}
                          </TableCell>
                          <TableCell className="text-center">
                            {formatCurrencyNoDecimals(detail.monto)}
                          </TableCell>
                          <TableCell className="text-center font-semibold">
                            {formatCurrencyNoDecimals(detail.total)}
                          </TableCell>
                          <TableCell className="text-center">
                            {getStatusBadge(detail.estado)}
                          </TableCell>
                                                 </TableRow>
                       ))}
                     </TableBody>
                   </Table>
                 </div>
               </div>

               {/* Paginador */}
               {totalPages > 1 && (
                 <div className="mt-6">
                   <Paginate
                     page={currentPage}
                     totalPages={totalPages}
                     setPage={setCurrentPage}
                   />
                 </div>
               )}
             </>
           )}
        </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
