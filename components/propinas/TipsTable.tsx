import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { Eye } from "lucide-react";
import { formatCurrencyNoDecimals, formatFechaLarga } from "@/lib/formatters";
import { PropinaResumen } from "@/types/propina";
import { useUserPermissions } from "@/hooks/useUserPermissions";

interface TipsTableProps {
  loading: boolean;
  rows: PropinaResumen[];
  rowsPerPage: number;
  onVerDetalle: (usuario: PropinaResumen) => void;
}

export default function TipsTable({ loading, rows, rowsPerPage, onVerDetalle }: TipsTableProps) {
  const { hasPermission } = useUserPermissions();
  
  // Verificar permiso para ver detalles
  const canViewDetail = hasPermission('propinas', 'ver_detalles');
  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="font-normal text-xs sm:text-sm text-gray-500">Usuario</TableHead>
            <TableHead className="font-normal text-xs sm:text-sm text-gray-500">Total</TableHead>
            <TableHead className="font-normal text-xs sm:text-sm text-gray-500">Última</TableHead>
            <TableHead className="font-normal text-xs sm:text-sm text-gray-500">Promedio</TableHead>
            {canViewDetail && (
              <TableHead className="font-normal text-xs sm:text-sm text-gray-500">Detalle</TableHead>
            )}
          </TableRow>
        </TableHeader>
        <TableBody>
          {loading ? (
            Array.from({ length: rowsPerPage }).map((_, i) => (
              <TableRow key={i}>
                <TableCell><Skeleton className="h-5 w-32 rounded" /></TableCell>
                <TableCell><Skeleton className="h-5 w-20 rounded" /></TableCell>
                <TableCell><Skeleton className="h-5 w-24 rounded" /></TableCell>
                <TableCell><Skeleton className="h-5 w-16 rounded" /></TableCell>
                {canViewDetail && (
                  <TableCell><Skeleton className="h-5 w-10 rounded" /></TableCell>
                )}
              </TableRow>
            ))
          ) : (
            rows.map((propina) => (
              <TableRow key={propina.id_usuario} className="hover:bg-gray-50">
                <TableCell className="text-xs sm:text-sm text-gray-700">
                  <div className="font-medium text-gray-800">{propina.nombre_completo}</div>
                  <div className="text-xs text-gray-500">@{propina.nick}</div>
                </TableCell>
                <TableCell className="font-semibold text-xs sm:text-sm text-gray-700">{formatCurrencyNoDecimals(propina.total_propinas)}</TableCell>
                <TableCell className="text-xs sm:text-sm text-gray-700">{formatFechaLarga(propina.fecha_crea)}</TableCell>
                <TableCell className="text-xs sm:text-sm">
                  <Badge variant="secondary" className="text-xs sm:text-sm px-2 py-1 rounded-full">
                    {formatCurrencyNoDecimals(propina.total_propinas)}
                  </Badge>
                </TableCell>
                {canViewDetail && (
                  <TableCell>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => onVerDetalle(propina)}
                          className="hover:text-blue-600 border-none"
                        >
                          <Eye className="h-3 w-3 sm:h-4 sm:w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Ver detalle</TooltipContent>
                    </Tooltip>
                  </TableCell>
                )}
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}