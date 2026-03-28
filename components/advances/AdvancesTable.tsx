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
import { Anticipo } from "@/hooks/personal/useAnticipos";
import { User, Calendar, Wallet, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface AdvancesTableProps {
  loading: boolean;
  advances: Anticipo[];
  pageSize?: number;
  isAdmin?: boolean;
  onAction?: (id: string | number, action: 'approve' | 'reject') => Promise<any>;
}

export default function AdvancesTable({
  loading,
  advances,
  pageSize = 10,
  isAdmin = false,
  onAction,
}: AdvancesTableProps) {

  if (advances.length === 0 && !loading) {
    return (
      <Card className="border-none shadow-md rounded-3xl bg-white dark:bg-slate-900/40 overflow-hidden">
        <CardContent className="flex flex-col items-center justify-center py-16 text-gray-500">
          <Wallet className="h-12 w-12 mb-4 opacity-20" />
          <p className="text-lg font-medium">No hay anticipos registrados</p>
        </CardContent>
      </Card>
    );
  }

  const getStatusBadge = (estado: number) => {
    if (Number(estado) === 2) {
      return (
        <Badge className="rounded-full px-3 py-1 bg-blue-100 text-blue-700 border-none hover:bg-blue-100 flex items-center gap-1 w-fit mx-auto lg:mx-0 font-bold uppercase tracking-tighter text-[10px]">
          Pendiente
        </Badge>
      );
    }
    if (Number(estado) === 3) {
      return (
        <Badge className="rounded-full px-3 py-1 bg-rose-100 text-rose-700 border-none hover:bg-rose-100 flex items-center gap-1 w-fit mx-auto lg:mx-0 font-bold uppercase tracking-tighter text-[10px]">
          Rechazado
        </Badge>
      );
    }
    if (Number(estado) === 1 || Number(estado) === 0) {
      return (
        <Badge className="rounded-full px-3 py-1 bg-amber-100 text-amber-700 border-none hover:bg-amber-100 flex items-center gap-1 w-fit mx-auto lg:mx-0 font-bold uppercase tracking-tighter text-[10px]">
          Por Cobrar
        </Badge>
      );
    }
    return (
      <Badge className="rounded-full px-3 py-1 bg-emerald-100 text-emerald-700 border-none hover:bg-emerald-100 flex items-center gap-1 w-fit mx-auto lg:mx-0 font-bold uppercase tracking-tighter text-[10px]">
        Pagado
      </Badge>
    );
  };

  // Vista de tarjetas para móviles
  const MobileCardView = () => (
    <div className="lg:hidden space-y-4">
      {loading ? (
        Array.from({ length: 5 }).map((_, i) => (
          <Card key={i} className="rounded-3xl border-none shadow-sm p-4">
            <Skeleton className="h-6 w-1/2 mb-4" />
            <div className="space-y-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
            </div>
          </Card>
        ))
      ) : (
        advances.map((a) => (
          <Card key={a.id_anticipo} className="rounded-3xl border-none shadow-md bg-white dark:bg-slate-900 overflow-hidden group hover:scale-[1.01] transition-transform duration-200">
            <CardContent className="p-5 space-y-4">
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold overflow-hidden border-2 border-white dark:border-slate-800 shadow-sm">
                    {a.foto ? (
                      <img 
                        src={a.foto.startsWith('http') ? a.foto : `/img/users/${a.foto}`} 
                        alt={a.nick} 
                        className="h-full w-full object-cover" 
                      />
                    ) : (
                      <span className="text-sm">{(a.name || a.nombre || '')?.substring(0, 1)}{(a.lastName || a.apellido || '')?.substring(0, 1)}</span>
                    )}
                  </div>
                  <div className="flex flex-col">
                    <span className="text-sm font-bold text-gray-900 dark:text-white leading-tight">
                      {a.name || a.nombre} {a.lastName || a.apellido}
                    </span>
                    <span className="text-[10px] text-purple-600 font-semibold uppercase tracking-wider">
                      @{a.nick}
                    </span>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2">
                  {getStatusBadge(a.estado)}
                </div>
              </div>

              <div className="flex items-center justify-between pb-1">
                 <div className="flex items-center gap-2 text-[10px] text-gray-500 font-medium">
                    <Calendar className="h-3 w-3" />
                    {formatDateTimeDmyLabel(a.fecha_crea).date}
                 </div>
                 <div className="text-lg font-black text-emerald-600">
                    {formatCurrencyCLP(a.monto)}
                  </div>
              </div>

              {isAdmin && Number(a.estado) === 2 && onAction && (
                <div className="flex gap-2 pt-2 border-t border-gray-50 dark:border-gray-800">
                  <Button 
                    variant="ghost" 
                    className="flex-1 rounded-2xl bg-emerald-50 text-emerald-700 hover:bg-emerald-100 font-bold text-xs h-9"
                    onClick={() => onAction(a.id_anticipo, 'approve')}
                  >
                    <Check className="h-4 w-4 mr-2" /> Aprobar
                  </Button>
                  <Button 
                    variant="ghost" 
                    className="flex-1 rounded-2xl bg-rose-50 text-rose-700 hover:bg-rose-100 font-bold text-xs h-9"
                    onClick={() => onAction(a.id_anticipo, 'reject')}
                  >
                    <X className="h-4 w-4 mr-2" /> Rechazar
                  </Button>
                </div>
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
          <TableHeader className="bg-gray-50/50 dark:bg-slate-900/50">
            <TableRow className="hover:bg-transparent border-gray-100 dark:border-gray-800">
              <TableHead className="py-5 px-6 font-bold text-xs uppercase text-gray-500">Empleado</TableHead>
              <TableHead className="py-5 px-6 font-bold text-xs uppercase text-gray-500 text-center">Fecha Solic.</TableHead>
              <TableHead className="py-5 px-6 font-bold text-xs uppercase text-gray-500 text-center">Estado</TableHead>
              <TableHead className="py-5 px-6 font-bold text-xs uppercase text-gray-500 text-right">Monto</TableHead>
              {isAdmin && <TableHead className="py-5 px-6 font-bold text-xs uppercase text-gray-500 text-center">Acciones</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              Array.from({ length: pageSize }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton className="h-10 w-40 rounded-full" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-28 mx-auto" /></TableCell>
                  <TableCell><Skeleton className="h-6 w-20 mx-auto rounded-full" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-24 ml-auto" /></TableCell>
                  {isAdmin && <TableCell><Skeleton className="h-8 w-20 mx-auto rounded-full" /></TableCell>}
                </TableRow>
              ))
            ) : (
              advances.map((a) => {
                const creacion = formatDateTimeDmyLabel(a.fecha_crea);
                return (
                  <TableRow key={a.id_anticipo} className="hover:bg-gray-50/50 dark:hover:bg-slate-800/50 transition-colors border-gray-100 dark:border-gray-800 group">
                    <TableCell className="py-4 px-6">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold overflow-hidden border-2 border-white dark:border-slate-800 shadow-sm group-hover:scale-110 transition-transform duration-200">
                          {a.foto ? (
                            <img 
                              src={a.foto.startsWith('http') ? a.foto : `/img/users/${a.foto}`} 
                              alt={a.nick} 
                              className="h-full w-full object-cover" 
                            />
                          ) : (
                            <span className="text-sm">{(a.name || a.nombre || '')?.substring(0, 1)}{(a.lastName || a.apellido || '')?.substring(0, 1)}</span>
                          )}
                        </div>
                        <div className="flex flex-col">
                          <span className="font-bold text-sm text-gray-900 dark:text-white leading-tight">
                            {a.name || a.nombre} {a.lastName || a.apellido}
                          </span>
                          <span className="text-[10px] text-purple-600 font-bold uppercase tracking-wider">
                            @{a.nick}
                          </span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="py-4 px-6 text-center">
                      <div className="flex flex-col">
                        <span className="font-bold text-sm text-gray-900 dark:text-white">{creacion.date}</span>
                        <span className="text-xs text-gray-400">{creacion.time}</span>
                      </div>
                    </TableCell>
                    <TableCell className="py-4 px-6 text-center">
                      {getStatusBadge(a.estado)}
                    </TableCell>
                    <TableCell className="py-4 px-6 text-right">
                      <span className="font-black text-base text-emerald-600">
                        {formatCurrencyCLP(a.monto)}
                      </span>
                    </TableCell>
                    {isAdmin && (
                      <TableCell className="py-4 px-6 text-center">
                        {Number(a.estado) === 2 && onAction ? (
                          <div className="flex items-center justify-center gap-2">
                             <Button 
                              size="sm" 
                              variant="ghost" 
                              className="h-8 rounded-full bg-emerald-50 text-emerald-700 hover:bg-emerald-100 px-3 font-bold text-[10px] uppercase transition-all active:scale-95"
                              onClick={() => onAction(a.id_anticipo, 'approve')}
                            >
                              <Check className="h-3 w-3 mr-1" /> Aprobar
                            </Button>
                            <Button 
                              size="sm" 
                              variant="ghost" 
                              className="h-8 rounded-full bg-rose-50 text-rose-700 hover:bg-rose-100 px-3 font-bold text-[10px] uppercase transition-all active:scale-95"
                              onClick={() => onAction(a.id_anticipo, 'reject')}
                            >
                              <X className="h-3 w-3 mr-1" /> Rechazar
                            </Button>
                          </div>
                        ) : (
                          <div className="flex justify-center">
                            <Badge className="rounded-full px-3 py-1 bg-gray-100 text-gray-400 border-none font-bold uppercase tracking-tighter text-[9px] italic">
                              Ya Procesado
                            </Badge>
                          </div>
                        )}
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
  );;

  return (
    <div className="space-y-4">
      <MobileCardView />
      <DesktopTableView />
    </div>
  );
}
