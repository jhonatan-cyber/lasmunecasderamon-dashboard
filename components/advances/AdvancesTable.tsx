/* eslint-disable */
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { User, DollarSign, Calendar, CheckCircle, Clock, Banknote } from "lucide-react";
import { formatCurrencyCLP } from "@/lib/utils/formatters";

export interface Advance {
  id: string | number;
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
      return <Badge className="bg-red-200 text-red-800 text-sm">Por cobrar</Badge>;
    } else {
      return <Badge className="bg-green-200 text-green-800 text-sm">Pagado</Badge>;
    }
  };

  const getEstadoIcon = (estado: string) => {
    if (estado === "1") {
      return <Clock className="text-red-500 w-4" />;
    } else {
      return <CheckCircle className="text-green-500 w-4" />;
    }
  };

  const formatFecha = (fecha: string) => {
    const d = new Date(fecha);
    if (isNaN(d.getTime())) return { fecha: "—", hora: "—" };
    // Ejemplo: 26-agosto- de 2025
    const fechaStr = format(d, "d-LLLL- 'de' yyyy", { locale: es });
    const horaStr = format(d, "HH:mm:ss", { locale: es });
    return { fecha: fechaStr, hora: horaStr };
  };

  // Vista de tarjetas para móviles
  const MobileCardView = () => (
    <div className='space-y-4 lg:hidden'>
      {loading
        ? Array.from({ length: 5 }).map((_, i) => (
            <Card key={i} className='shadow-sm'>
              <CardContent className='p-4'>
                <div className='space-y-3'>
                  <Skeleton className="h-5 w-40" />
                  <Skeleton className="h-5 w-28" />
                  <Skeleton className="h-5 w-24" />
                </div>
              </CardContent>
            </Card>
          ))
        : advances.length === 0 ? (
            <Card className='shadow-sm'>
              <CardContent className='p-6 text-center'>
                <p className="text-gray-400 text-base">No hay anticipos registrados</p>
              </CardContent>
            </Card>
          ) : (
            advances.map((a) => {
              const { fecha, hora } = formatFecha(a.fecha_crea);
              return (
                <Card key={a.id} className='shadow-sm hover:shadow-md transition-shadow'>
                  <CardContent className='p-4'>
                    <div className='space-y-3'>
                      {/* Header con usuario y estado */}
                      <div className='flex items-center justify-between'>
                        <h3 className='font-semibold text-xl text-gray-900'>{a.usuario}</h3>
                        {getEstadoBadge(a.estado)}
                      </div>

                      {/* Información del anticipo */}
                      <div className='grid grid-cols-1 sm:grid-cols-2 gap-3 text-base'>
                        <div className='flex items-center gap-2'>
                          <Banknote className='text-gray-500 w-4' />
                          <span className='font-medium'>Monto:</span>
                          <span className='text-gray-700 font-semibold'>{formatCurrencyCLP(a.monto)}</span>
                        </div>

                        <div className='flex items-center gap-2'>
                          <Calendar className='text-gray-500 w-4' />
                          <span className='font-medium'>Fecha:</span>
                          <div className='text-gray-700'>
                            <div className='font-medium'>{fecha}</div>
                            <div className='text-sm text-gray-500'>{hora}</div>
                          </div>
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
              );
            })
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
              <TableHead className="font-normal text-sm text-gray-500 text-center">Usuario</TableHead>
              <TableHead className="font-normal text-sm text-gray-500 text-center">Monto</TableHead>
              <TableHead className="font-normal text-sm text-gray-500 text-center">Fecha</TableHead>
              <TableHead className="font-normal text-sm text-gray-500 text-center">Estado</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading
              ? Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell className="text-center"><Skeleton className="h-6 w-40 mx-auto" /></TableCell>
                    <TableCell className="text-center"><Skeleton className="h-6 w-24 mx-auto" /></TableCell>
                    <TableCell className="text-center"><Skeleton className="h-6 w-32 mx-auto" /></TableCell>
                    <TableCell className="text-center"><Skeleton className="h-6 w-20 mx-auto" /></TableCell>
                  </TableRow>
                ))
              : advances.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-gray-400 text-base py-6">
                      No hay anticipos registrados
                    </TableCell>
                  </TableRow>
                ) : (
                  advances.map((a) => {
                    const { fecha, hora } = formatFecha(a.fecha_crea);
                    return (
                      <TableRow key={a.id}>
                        <TableCell className="text-sm text-gray-700 text-center">{a.usuario}</TableCell>
                        <TableCell className="font-semibold text-sm text-gray-700 text-center">{formatCurrencyCLP(a.monto)}</TableCell>
                        <TableCell className="text-sm text-gray-700 text-center">
                          <div className='leading-tight'>
                            <div className='font-medium'>{fecha}</div>
                            <div className='text-xs text-gray-500'>{hora}</div>
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          {getEstadoBadge(a.estado)}
                        </TableCell>
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
    <>
      <MobileCardView />
      <DesktopTableView />
    </>
  );
}

