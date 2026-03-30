"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useOvertime } from "@/hooks/personal/useOvertime";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { formatCurrencyCLP } from "@/lib/utils/formatters";
import { formatDateTimeDmyLabel } from "@/lib/utils/calendarUtils";
import { Clock, Calendar, DollarSign, Timer, CheckCircle2, User } from "lucide-react";
import SelectElements from "@/components/shared/SelectElements";
import Paginate from "@/components/shared/Paginate";

interface OvertimeDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  userName: string;
}

export default function OvertimeDetailModal({
  isOpen,
  onClose,
  userId,
  userName,
}: OvertimeDetailModalProps) {
  const {
    getOvertimeDetails,
    overtimeDetails: details,
    detailsLoading: loading,
    detailsError: error,
  } = useOvertime();

  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(5);

  useEffect(() => {
    if (isOpen && userId) {
      getOvertimeDetails(userId).catch(console.error);
    }
  }, [isOpen, userId, getOvertimeDetails]);

  const getStatusBadge = (estado: number) => {
    if (estado === 1) {
      return (
        <Badge className="rounded-full px-3 py-1 bg-amber-100 text-amber-700 border-none hover:bg-amber-100 flex items-center gap-1 font-bold uppercase tracking-tighter text-[10px]">
          <Timer className="h-3 w-3" />
          Pendiente
        </Badge>
      );
    }
    return (
      <Badge className="rounded-full px-3 py-1 bg-emerald-100 text-emerald-700 border-none hover:bg-emerald-100 flex items-center gap-1 font-bold uppercase tracking-tighter text-[10px]">
        <CheckCircle2 className="h-3 w-3" />
        Pagado
      </Badge>
    );
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

  const totalPages = Math.ceil(details.length / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const paginatedDetails = details.slice(startIndex, startIndex + pageSize);

  useEffect(() => {
    setCurrentPage(1);
  }, [details.length]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[95vh] p-0 border-none shadow-2xl rounded-3xl overflow-hidden bg-white dark:bg-slate-900 flex flex-col">
        <DialogHeader className="px-8 pt-8 pb-4 bg-gray-50/50 dark:bg-slate-800/50 border-b border-gray-100 dark:border-gray-800">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-2xl">
              <Clock className="h-6 w-6 text-purple-600" />
            </div>
            <div>
              <DialogTitle className="text-xl font-black text-gray-900 dark:text-white uppercase tracking-tight">
                Detalle de Horas Extras
              </DialogTitle>
              <div className="flex items-center gap-2 text-sm text-gray-500 font-medium">
                <User className="h-4 w-4" />
                {userName}
              </div>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 flex flex-col overflow-hidden px-8 py-6">
          {/* Card de Resumen Premium (fijo arriba) */}
          <div className="flex-shrink-0 grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
            <Card className="rounded-3xl border-none shadow-md bg-blue-50/50 dark:bg-blue-900/20 overflow-hidden">
              <CardContent className="p-6 flex items-center gap-4">
                <div className="h-12 w-12 rounded-2xl bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center">
                  <Clock className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <p className="text-[10px] uppercase font-black text-blue-400 tracking-wider">Total Horas</p>
                  <p className="text-2xl font-black text-gray-900 dark:text-white">{totalHoras.toFixed(1)} hrs</p>
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-3xl border-none shadow-md bg-emerald-50/50 dark:bg-emerald-900/20 overflow-hidden">
              <CardContent className="p-6 flex items-center gap-4">
                <div className="h-12 w-12 rounded-2xl bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center">
                  <DollarSign className="h-6 w-6 text-emerald-600" />
                </div>
                <div>
                  <p className="text-[10px] uppercase font-black text-emerald-400 tracking-wider">Total Acumulado</p>
                  <p className="text-2xl font-black text-emerald-600">{formatCurrencyCLP(totalMonto)}</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Listado de Horas Extras (solo esta sección scrollea) */}
          <div className="flex-1 overflow-y-auto space-y-4 pr-2 scrollbar-thin scrollbar-thumb-gray-200 dark:scrollbar-thumb-gray-800">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-black uppercase tracking-widest text-gray-400">Desglose de Registros</h4>
              <div className="flex items-center gap-4">
                <SelectElements
                  value={pageSize}
                  onChange={setPageSize}
                  options={[5, 10, 20]}
                  label="Mostrar"
                />
              </div>
            </div>

            {loading ? (
              <div className="flex flex-col items-center justify-center py-12 space-y-4">
                <div className="h-12 w-12 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin" />
                <p className="text-sm font-bold text-gray-400 uppercase tracking-tighter">Cargando registros...</p>
              </div>
            ) : details.length === 0 ? (
              <div className="text-center py-12 bg-gray-50 dark:bg-slate-800/30 rounded-3xl border-2 border-dashed border-gray-100 dark:border-gray-800">
                <p className="text-gray-400 font-medium tracking-tight">No se encontraron registros de horas extras</p>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="bg-white dark:bg-slate-900/40 border border-gray-100 dark:border-gray-800 rounded-3xl overflow-hidden">
                  <Table>
                    <TableHeader className="bg-gray-50/50 dark:bg-slate-800/50">
                      <TableRow>
                        <TableHead className="font-bold text-[10px] uppercase text-gray-400 py-4 px-6 text-center">Fecha</TableHead>
                        <TableHead className="font-bold text-[10px] uppercase text-gray-400 py-4 px-6 text-center">Horas</TableHead>
                        <TableHead className="font-bold text-[10px] uppercase text-gray-400 py-4 px-6 text-center">Valor Hora</TableHead>
                        <TableHead className="font-bold text-[10px] uppercase text-gray-400 py-4 px-6 text-right">Total</TableHead>
                        <TableHead className="font-bold text-[10px] uppercase text-gray-400 py-4 px-6 text-center">Estado</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginatedDetails.map((detail, index) => {
                        const creacion = formatDateTimeDmyLabel(detail.fecha_crea);
                        return (
                          <TableRow key={index} className="hover:bg-gray-50/50 dark:hover:bg-slate-800/50 transition-colors border-gray-50 dark:border-gray-800">
                            <TableCell className="py-4 px-6 text-center">
                              <div className="flex flex-col">
                                <span className="font-bold text-sm text-gray-900 dark:text-white">{creacion.date}</span>
                                <span className="text-[10px] text-gray-400 font-medium">{creacion.time}</span>
                              </div>
                            </TableCell>
                            <TableCell className="py-4 px-6 text-center font-bold text-sm text-gray-700 dark:text-gray-300">
                              {detail.hora.toFixed(1)} hrs
                            </TableCell>
                            <TableCell className="py-4 px-6 text-center text-sm text-gray-500">
                              {formatCurrencyCLP(detail.monto)}
                            </TableCell>
                            <TableCell className="py-4 px-6 text-right">
                              <span className="font-black text-emerald-600">{formatCurrencyCLP(detail.total)}</span>
                            </TableCell>
                            <TableCell className="py-4 px-6 text-center">
                              <div className="flex justify-center">{getStatusBadge(detail.estado)}</div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>

                {totalPages > 1 && (
                  <div className="flex justify-center pt-2">
                    <Paginate
                      page={currentPage}
                      totalPages={totalPages}
                      setPage={setCurrentPage}
                    />
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="px-8 py-4 bg-gray-50/50 dark:bg-slate-800/50 border-t border-gray-100 dark:border-gray-800 flex items-center justify-center sm:justify-center">
          <Button
            onClick={onClose}
            variant="outline"
            className="rounded-full px-8 font-bold hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black transition-all duration-200"
          >
            Cerrar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

