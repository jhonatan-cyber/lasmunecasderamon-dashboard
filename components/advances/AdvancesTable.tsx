import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { User, DollarSign, Calendar, CheckCircle, Clock, Banknote } from "lucide-react";

export interface Advance {
  id: number;
  usuario: string;
  monto: number;
  fecha_crea: string;
  estado: string;
}

interface AdvancesTableProps {
  advances: Advance[];
  loading?: boolean;
}

export default function AdvancesTable({ advances, loading }: AdvancesTableProps) {
  const getEstadoBadge = (estado: string) => {
    if (estado === "1") {
      return <Badge className="bg-red-200 text-red-800 text-xs sm:text-sm">Por cobrar</Badge>;
    } else {
      return <Badge className="bg-green-200 text-green-800 text-xs sm:text-sm">Pagado</Badge>;
    }
  };

  const getEstadoIcon = (estado: string) => {
    if (estado === "1") {
          return <Clock className="text-red-500 w-4" />;
  } else {
    return <CheckCircle className="text-green-500 w-4" />;
  }
  };

  // Vista de tarjetas para móviles
  const MobileCardView = () => (
    <div className='space-y-4 lg:hidden'>
      {loading
        ? Array.from({ length: 5 }).map((_, i) => (
            <Card key={i} className='shadow-sm'>
              <CardContent className='p-4'>
                <div className='space-y-3'>
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-4 w-20" />
                </div>
              </CardContent>
            </Card>
          ))
        : advances.length === 0 ? (
            <Card className='shadow-sm'>
              <CardContent className='p-6 text-center'>
                <p className="text-gray-400 text-sm sm:text-base">No hay anticipos registrados</p>
              </CardContent>
            </Card>
          ) : (
            advances.map((a) => (
              <Card key={a.id} className='shadow-sm hover:shadow-md transition-shadow'>
                <CardContent className='p-4'>
                  <div className='space-y-3'>
                    {/* Header con usuario y estado */}
                    <div className='flex items-center justify-between'>
                      <h3 className='font-semibold text-lg text-gray-900'>{a.usuario}</h3>
                      {getEstadoBadge(a.estado)}
                    </div>

                    {/* Información del anticipo */}
                    <div className='grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm'>
                      <div className='flex items-center gap-2'>
                        <Banknote className='text-gray-500 w-4' />
                        <span className='font-medium'>Monto:</span>
                        <span className='text-gray-700 font-semibold'>${a.monto.toLocaleString("es-CL")}</span>
                      </div>

                      <div className='flex items-center gap-2'>
                        <Calendar className='text-gray-500 w-4' />
                        <span className='font-medium'>Fecha:</span>
                        <span className='text-gray-700'>{format(new Date(a.fecha_crea), "dd/MMM/yyyy", { locale: es })}</span>
                      </div>

                      <div className='flex items-center gap-2'>
                        <User className='text-gray-500 w-4' />
                        <span className='font-medium'>Usuario:</span>
                        <span className='text-gray-700'>{a.usuario}</span>
                      </div>

                      <div className='flex items-center gap-2'>
                        {getEstadoIcon(a.estado)}
                        <span className='font-medium'>Estado:</span>
                        <span className='text-gray-700'>{a.estado === "1" ? "Por cobrar" : "Pagado"}</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
    </div>
  );

  // Vista de tabla para pantallas grandes
  const DesktopTableView = () => (
    <div className='hidden lg:block'>
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="font-normal text-xs text-gray-500 text-center">Usuario</TableHead>
              <TableHead className="font-normal text-xs text-gray-500 text-center">Monto</TableHead>
              <TableHead className="font-normal text-xs text-gray-500 text-center">Fecha</TableHead>
              <TableHead className="font-normal text-xs text-gray-500 text-center">Estado</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading
              ? Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell className="text-center"><Skeleton className="h-5 w-32 mx-auto" /></TableCell>
                    <TableCell className="text-center"><Skeleton className="h-5 w-20 mx-auto" /></TableCell>
                    <TableCell className="text-center"><Skeleton className="h-5 w-24 mx-auto" /></TableCell>
                    <TableCell className="text-center"><Skeleton className="h-5 w-16 mx-auto" /></TableCell>
                  </TableRow>
                ))
              : advances.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-gray-400 text-sm py-6">
                      No hay anticipos registrados
                    </TableCell>
                  </TableRow>
                ) : (
                  advances.map((a) => (
                    <TableRow key={a.id}>
                      <TableCell className="text-xs text-gray-700 text-center">{a.usuario}</TableCell>
                      <TableCell className="font-semibold text-xs text-gray-700 text-center">${a.monto.toLocaleString("es-CL")}</TableCell>
                      <TableCell className="text-xs text-gray-700 text-center">{format(new Date(a.fecha_crea), "dd/MMM/yyyy", { locale: es })}</TableCell>
                      <TableCell className="text-center">
                        {getEstadoBadge(a.estado)}
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