/* eslint-disable */
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
import { formatCurrencyNoDecimals } from "@/lib/formatters";
import { Overtime } from "@/types/overtime";
import { User, Clock, DollarSign, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useUserPermissions } from "@/hooks/auth/useUserPermissions";

interface OvertimeTableProps {
  loading: boolean;
  rows: Overtime[];
  rowsPerPage: number;
  onViewDetail: (overtime: Overtime) => void;
}

export default function OvertimeTable({
  loading,
  rows,
  rowsPerPage,
  onViewDetail,
}: OvertimeTableProps) {
  const { hasPermission } = useUserPermissions();
  
  // Verificar permiso para ver detalles
  const canViewDetail = hasPermission('overtime', 'view_details');
  if (rows.length === 0 && !loading) {
    return (
      <div className="text-center py-8 sm:py-12 text-gray-500 text-sm sm:text-base">
        No hay horas extras registradas
      </div>
    );
  }

  // Vista de tarjetas para móviles
  const MobileCardView = () => (
    <div className="lg:hidden space-y-3">
      {loading ? (
        // Skeleton cards
        Array.from({ length: rowsPerPage }).map((_, i) => (
          <Card key={i} className="p-4 sm:p-6">
            <CardContent className="space-y-3">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-6 w-20" />
            </CardContent>
          </Card>
        ))
      ) : (
        // Data cards
        rows.map((overtime) => (
          <Card key={overtime.id_hora_extra} className="p-4 sm:p-6">
            <CardContent className="space-y-3">
              {/* Header con usuario y botón de detalles */}
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-gray-400" />
                  <span className="font-medium text-sm sm:text-base">
                    {overtime.usuario}
                  </span>
                </div>
                {canViewDetail && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onViewDetail(overtime)}
                    className="h-8 w-8 p-0 hover:bg-blue-50"
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                )}
              </div>

              {/* Información de horas extras */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Clock className="h-3 w-3 text-gray-400" />
                  <span className="text-xs sm:text-sm text-gray-600">
                    Horas: {overtime.hora} hrs
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <DollarSign className="h-3 w-3 text-blue-500" />
                  <span className="text-xs sm:text-sm text-gray-600">
                    Precio/hora: {formatCurrencyNoDecimals(overtime.monto)}
                  </span>
                </div>

                <div className="flex items-center gap-2 pt-2 border-t border-gray-200">
                  <DollarSign className="h-3 w-3 text-green-500" />
                  <span className="text-sm sm:text-base font-semibold text-green-600">
                    Total: {formatCurrencyNoDecimals(overtime.total)}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );

  // Vista de tabla para desktop
  const DesktopTableView = () => (
    <div className="hidden lg:block">
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="font-normal text-xs sm:text-sm text-gray-500 text-center">USUARIO</TableHead>
              <TableHead className="font-normal text-xs sm:text-sm text-gray-500 text-center">HORAS</TableHead>
              <TableHead className="font-normal text-xs sm:text-sm text-gray-500 text-center">TOTAL</TableHead>
              {canViewDetail && (
                <TableHead className="font-normal text-xs sm:text-sm text-gray-500 text-center">DETALLE</TableHead>
              )}
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              // Skeleton rows
              Array.from({ length: rowsPerPage }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell className="text-center">
                    <Skeleton className="h-4 w-32 mx-auto" />
                  </TableCell>
                  <TableCell className="text-center">
                    <Skeleton className="h-4 w-20 mx-auto" />
                  </TableCell>
                  <TableCell className="text-center">
                    <Skeleton className="h-4 w-24 mx-auto" />
                  </TableCell>
                  {canViewDetail && (
                    <TableCell className="text-center">
                      <Skeleton className="h-6 w-20 mx-auto" />
                    </TableCell>
                  )}
                </TableRow>
              ))
            ) : (
              // Data rows
              rows.map((overtime) => (
                <TableRow key={overtime.id_hora_extra}>
                  <TableCell className="text-center font-medium text-sm sm:text-base">
                    {overtime.usuario}
                  </TableCell>
                  <TableCell className="text-center text-sm sm:text-base">
                    {overtime.hora} hrs
                  </TableCell>
                  <TableCell className="text-center font-semibold text-sm sm:text-base">
                    {formatCurrencyNoDecimals(overtime.total)}
                  </TableCell>
                  {canViewDetail && (
                    <TableCell className="text-center">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onViewDetail(overtime)}
                        className="h-8 w-8 p-0 hover:bg-blue-50"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  )}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );

  return (
    <>
      <MobileCardView />
      <DesktopTableView />
    </>
  );
}

