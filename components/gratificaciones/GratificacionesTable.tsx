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
import { Gratificacion } from "@/types/gratificacion";
import { User, DollarSign, Eye, Calendar, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useUserPermissions } from "@/hooks/auth/useUserPermissions";

interface GratificacionesTableProps {
  loading: boolean;
  rows: Gratificacion[];
  rowsPerPage: number;
  onViewDetail: (gratificacion: Gratificacion) => void;
  onEdit: (gratificacion: Gratificacion) => void;
  onDelete: (gratificacion: Gratificacion) => void;
}

export default function GratificacionesTable({
  loading,
  rows,
  rowsPerPage,
  onViewDetail,
  onEdit,
  onDelete,
}: GratificacionesTableProps) {
  const { hasPermission } = useUserPermissions();
  
  const canViewDetail = hasPermission('gratificaciones', 'view_details');
  const canEdit = hasPermission('gratificaciones', 'edit');
  const canDelete = hasPermission('gratificaciones', 'delete');

  const formatDateTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleString('es-CO', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (rows.length === 0 && !loading) {
    return (
      <div className="text-center py-8 sm:py-12 text-gray-500 text-sm sm:text-base">
        No hay gratificaciones registradas
      </div>
    );
  }

  const MobileCardView = () => (
    <div className="lg:hidden space-y-3">
      {loading ? (
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
        rows.map((gratificacion) => (
          <Card key={gratificacion.id} className="p-4 sm:p-6">
            <CardContent className="space-y-3">
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-gray-400" />
                  <span className="font-medium text-sm sm:text-base">
                    {gratificacion.usuario}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  {canViewDetail && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onViewDetail(gratificacion)}
                      className="h-8 w-8 p-0 hover:bg-blue-50"
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                  )}
                  {canEdit && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onEdit(gratificacion)}
                      className="h-8 w-8 p-0 hover:bg-yellow-50"
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                  )}
                  {canDelete && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onDelete(gratificacion)}
                      className="h-8 w-8 p-0 hover:bg-red-50 text-red-500"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Calendar className="h-3 w-3 text-gray-400" />
                  <span className="text-xs sm:text-sm text-gray-600">
                    {formatDateTime(gratificacion.fecha_hora)}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <DollarSign className="h-3 w-3 text-blue-500" />
                  <span className="text-xs sm:text-sm text-gray-600">
                    Monto: {formatCurrencyNoDecimals(gratificacion.monto)}
                  </span>
                </div>

                {gratificacion.descripcion && (
                  <div className="pt-2 border-t border-gray-200">
                    <span className="text-xs sm:text-sm text-gray-600">
                      {gratificacion.descripcion}
                    </span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );

  const DesktopTableView = () => (
    <div className="hidden lg:block">
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="font-normal text-xs sm:text-sm text-gray-500 text-center">USUARIO</TableHead>
              <TableHead className="font-normal text-xs sm:text-sm text-gray-500 text-center">FECHA HORA</TableHead>
              <TableHead className="font-normal text-xs sm:text-sm text-gray-500 text-center">MONTO</TableHead>
              <TableHead className="font-normal text-xs sm:text-sm text-gray-500 text-center">DESCRIPCIÓN</TableHead>
              <TableHead className="font-normal text-xs sm:text-sm text-gray-500 text-center">ACCIONES</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              Array.from({ length: rowsPerPage }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell className="text-center">
                    <Skeleton className="h-4 w-32 mx-auto" />
                  </TableCell>
                  <TableCell className="text-center">
                    <Skeleton className="h-4 w-40 mx-auto" />
                  </TableCell>
                  <TableCell className="text-center">
                    <Skeleton className="h-4 w-24 mx-auto" />
                  </TableCell>
                  <TableCell className="text-center">
                    <Skeleton className="h-4 w-32 mx-auto" />
                  </TableCell>
                  <TableCell className="text-center">
                    <Skeleton className="h-6 w-24 mx-auto" />
                  </TableCell>
                </TableRow>
              ))
            ) : (
              rows.map((gratificacion) => (
                <TableRow key={gratificacion.id}>
                  <TableCell className="text-center font-medium text-sm sm:text-base">
                    {gratificacion.usuario}
                  </TableCell>
                  <TableCell className="text-center text-sm sm:text-base">
                    {formatDateTime(gratificacion.fecha_hora)}
                  </TableCell>
                  <TableCell className="text-center font-semibold text-sm sm:text-base">
                    {formatCurrencyNoDecimals(gratificacion.monto)}
                  </TableCell>
                  <TableCell className="text-center text-sm sm:text-base max-w-xs truncate">
                    {gratificacion.descripcion || '-'}
                  </TableCell>
                  <TableCell className="text-center">
                    <div className="flex items-center justify-center gap-1">
                      {canViewDetail && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onViewDetail(gratificacion)}
                          className="h-8 w-8 p-0 hover:bg-blue-50"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      )}
                      {canEdit && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onEdit(gratificacion)}
                          className="h-8 w-8 p-0 hover:bg-yellow-50"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                      )}
                      {canDelete && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onDelete(gratificacion)}
                          className="h-8 w-8 p-0 hover:bg-red-50 text-red-500"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
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
