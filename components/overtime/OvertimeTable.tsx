"use client";

import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import { formatCurrencyCLP } from "@/lib/utils/formatters";
import { formatDateTimeDmyLabel } from "@/lib/utils/calendarUtils";
import { Overtime } from "@/types/overtime";
import { User, Clock, DollarSign, Calendar, Eye, CheckCircle2, Timer } from "lucide-react";
import { Button } from "@/components/ui/button";

interface OvertimeTableProps {
  loading: boolean;
  rows: Overtime[];
  pageSize: number;
  onViewDetail?: (overtime: Overtime) => void;
  isAdmin?: boolean;
}

export default function OvertimeTable({
  loading,
  rows,
  pageSize,
  onViewDetail,
  isAdmin = false,
}: OvertimeTableProps) {

  if (rows.length === 0 && !loading) {
    return (
      <Card className="border-none shadow-md rounded-3xl bg-white dark:bg-slate-900/40 overflow-hidden">
        <CardContent className="flex flex-col items-center justify-center py-12 text-gray-500">
          <Clock className="h-12 w-12 mb-4 opacity-20" />
          <p className="text-lg font-medium">No hay horas extras registradas</p>
        </CardContent>
      </Card>
    );
  }

  const getStatusBadge = (estado: number) => {
    if (estado === 1) {
      return (
        <Badge className="rounded-full px-3 py-1 bg-amber-100 text-amber-700 border-none hover:bg-amber-100 flex items-center gap-1 w-fit mx-auto font-bold uppercase tracking-tighter text-[10px]">

          Por pagar
        </Badge>
      );
    }
    return (
      <Badge className="rounded-full px-3 py-1 bg-emerald-100 text-emerald-700 border-none hover:bg-emerald-100 flex items-center gap-1 w-fit mx-auto font-bold uppercase tracking-tighter text-[10px]">

        Pagado
      </Badge>
    );
  };

  // Vista de tarjetas para móviles
  const MobileCardView = () => (
    <div className="lg:hidden space-y-4">
      {loading ? (
        Array.from({ length: pageSize }).map((_, i) => (
          <Card key={i} className="rounded-3xl border-none shadow-sm p-4">
            <Skeleton className="h-6 w-1/2 mb-4" />
            <div className="space-y-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
            </div>
          </Card>
        ))
      ) : (
        rows.map((overtime) => (
          <Card key={overtime.id_hora_extra} className="rounded-3xl border-none shadow-md bg-white dark:bg-slate-900 overflow-hidden group hover:scale-[1.01] transition-transform duration-200">
            <CardContent className="p-5 space-y-4">
              <div className="flex justify-between items-start">
                <div className="space-y-1">
                  {isAdmin && (
                    <div className="flex items-center gap-2 text-sm font-bold text-gray-900 dark:text-white">
                      <User className="h-4 w-4 text-purple-500" />
                      {overtime.usuario}
                    </div>
                  )}
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <Calendar className="h-3 w-3" />
                    {formatDateTimeDmyLabel(overtime.fecha_crea).date}
                  </div>
                </div>
                {getStatusBadge(overtime.estado)}
              </div>

              <div className="grid grid-cols-2 gap-4 py-3 border-y border-gray-50 dark:border-gray-800">
                <div className="space-y-1">
                  <span className="text-[10px] uppercase font-bold text-gray-400">Horas</span>
                  <div className="flex items-center gap-1.5 font-bold text-gray-900 dark:text-white">
                    <Clock className="h-4 w-4 text-blue-500" />
                    {overtime.hora.toFixed(1)} hrs
                  </div>
                </div>
                <div className="space-y-1 text-right">
                  <span className="text-[10px] uppercase font-bold text-gray-400">Total</span>
                  <div className="flex items-center justify-end gap-1.5 font-black text-emerald-600">
                    {formatCurrencyCLP(overtime.total)}
                  </div>
                </div>
              </div>

              {onViewDetail && (
                <Button
                  variant="secondary"
                  className="w-full rounded-2xl bg-gray-50 dark:bg-gray-800 font-bold text-xs uppercase"
                  onClick={() => onViewDetail(overtime)}
                >
                  Ver Detalle
                </Button>
              )}
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );

  // Vista de tabla para desktop
  const DesktopTableView = () => (
    <div className="hidden lg:block">
      <div className="bg-white dark:bg-slate-900/40 backdrop-blur-sm rounded-3xl border-none shadow-md overflow-hidden">
        <Table>
          <TableHeader className="bg-gray-100 dark:bg-slate-900/50">
            <TableRow className="hover:bg-transparent border-gray-100 dark:border-gray-800">
              {isAdmin && <TableHead className="py-5 px-6 font-bold text-xs uppercase text-gray-500">Usuario</TableHead>}
              <TableHead className="py-5 px-6 font-bold text-xs uppercase text-gray-500 text-center">Última Actividad</TableHead>
              <TableHead className="py-5 px-6 font-bold text-xs uppercase text-gray-500 text-center">Estado</TableHead>
              <TableHead className="py-5 px-6 font-bold text-xs uppercase text-gray-500 text-center">Total Horas</TableHead>
              <TableHead className="py-5 px-6 font-bold text-xs uppercase text-gray-500 text-right">Total Pagar</TableHead>
              {onViewDetail && <TableHead className="py-5 px-6 font-bold text-xs uppercase text-gray-500 text-center">Detalle</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              Array.from({ length: pageSize }).map((_, i) => (
                <TableRow key={i}>
                  {isAdmin && <TableCell><Skeleton className="h-4 w-32" /></TableCell>}
                  <TableCell><Skeleton className="h-4 w-28" /></TableCell>
                  <TableCell><Skeleton className="h-6 w-20 mx-auto rounded-full" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-12 mx-auto" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-20 mx-auto" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-24 ml-auto" /></TableCell>
                </TableRow>
              ))
            ) : (
              rows.map((overtime) => {
                const creacion = formatDateTimeDmyLabel(overtime.fecha_crea);
                return (
                  <TableRow key={overtime.id_hora_extra} className="border-b transition-colors hover:bg-gray-50 dark:hover:bg-slate-800/30">
                    {isAdmin && (
                      <TableCell className="py-4 px-6">
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded-full bg-purple-100 flex items-center justify-center text-purple-700 font-bold text-xs">
                            {overtime.usuario?.substring(0, 2).toUpperCase()}
                          </div>
                          <span className="font-bold text-sm text-gray-900 dark:text-white">{overtime.usuario}</span>
                        </div>
                      </TableCell>
                    )}
                    <TableCell className="py-4 px-6 text-center">
                      <div className="flex flex-col">
                        <span className="font-bold text-sm text-gray-900 dark:text-white">{creacion.date}</span>
                        <span className="text-xs text-gray-400">{creacion.time}</span>
                      </div>
                    </TableCell>
                    <TableCell className="py-4 px-6 text-center">
                      {getStatusBadge(overtime.estado)}
                    </TableCell>
                    <TableCell className="py-4 px-6 text-center">
                      <div className="flex items-center justify-center gap-1.5 font-bold text-sm text-gray-700 dark:text-gray-300">
                        <Clock className="h-4 w-4 text-blue-500" />
                        {overtime.hora.toFixed(1)} hrs
                      </div>
                    </TableCell>
                    <TableCell className="py-4 px-6 text-right">
                      <span className="font-black text-base text-emerald-600">
                        {formatCurrencyCLP(overtime.total)}
                      </span>
                    </TableCell>
                    {onViewDetail && (
                      <TableCell className="py-4 px-6 text-center">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => onViewDetail(overtime)}
                          className="h-9 w-9 rounded-xl hover:bg-blue-50 dark:hover:bg-blue-900/30 text-blue-600"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    )}
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  ); 

  return (
    <div className="space-y-4">
      <MobileCardView />
      <DesktopTableView />
    </div>
  );
}

