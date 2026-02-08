"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CuentaWithDetails } from "@/types/cuenta";
import { formatCurrencyNoDecimals } from "@/lib/formatters";
import { Eye, CreditCard, Trash2, MoreVertical, ShoppingCart, User, Bed, Calendar, DollarSign, Receipt } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import CuentaDetailModal from "./CuentaDetailModal";
import AgregarProductosModal from "./AgregarProductosModal";
import CobrarCuentaModal from "./CobrarCuentaModal";
import { useState } from "react";
import { useUserPermissions } from "@/hooks/useUserPermissions";

interface CuentaTableProps {
  loading: boolean;
  rows: CuentaWithDetails[];
  rowsPerPage: number;
  onRefresh?: () => void;
  onOrderStatusChange?: () => void;
}

export default function CuentaTable({
  loading,
  rows,
  rowsPerPage,
  onRefresh,
  onOrderStatusChange,
}: CuentaTableProps) {
  const { hasPermission } = useUserPermissions();
  const [selectedCuentaId, setSelectedCuentaId] = useState<number | null>(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [agregarProductosOpen, setAgregarProductosOpen] = useState(false);
  const [selectedCuentaForProductos, setSelectedCuentaForProductos] = useState<number | null>(null);
  const [cobrarCuentaOpen, setCobrarCuentaOpen] = useState(false);
  const [selectedCuentaForCobro, setSelectedCuentaForCobro] = useState<any>(null);
  
  // Verificar permisos
  const canViewDetails = hasPermission('cuentas', 'ver_detalles');
  const canAddProducts = hasPermission('cuentas', 'agregar_productos');
  const canCobrar = hasPermission('cuentas', 'cobrar');
  
  // Si no tiene ningún permiso de acción, no mostrar el menú
  const hasAnyAction = canViewDetails || canAddProducts || canCobrar;
  
  const getEstadoBadge = (estado: number) => {
    switch (estado) {
      case 1:
        return <Badge className="bg-red-100 text-red-800 text-xs sm:text-sm">Por Cobrar</Badge>;
      case 0:
        return <Badge className="bg-green-100 text-green-800 text-xs sm:text-sm">Cobrada</Badge>;
      default:
        return <Badge className="bg-gray-100 text-gray-800 text-xs sm:text-sm">Desconocido</Badge>;
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const day = date.getDate();
    const month = date.toLocaleDateString("es-ES", { month: "long" });
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  };

  const handleVerDetalles = (cuentaId: number) => {
    setSelectedCuentaId(cuentaId);
    setDetailModalOpen(true);
  };

  const handleAgregarProductos = (cuentaId: number) => {
    setSelectedCuentaForProductos(cuentaId);
    setAgregarProductosOpen(true);
  };

  const handleProductosAgregados = () => {
    console.log("Productos agregados exitosamente");
    // Actualizar los datos de la página
    if (onRefresh) {
      onRefresh();
    }
  };

  const handleCobrarCuenta = async (cuentaId: number) => {
    try {
      // Obtener los detalles completos de la cuenta
      const response = await fetch(`/api/cuentas/${cuentaId}`);
      if (!response.ok) {
        throw new Error("Error al obtener los detalles de la cuenta");
      }
      const cuentaData = await response.json();
      
      setSelectedCuentaForCobro(cuentaData);
      setCobrarCuentaOpen(true);
    } catch (error) {
      console.error("Error al obtener detalles de la cuenta:", error);
    }
  };

  const handleCuentaCobrada = () => {
    console.log("Cuenta cobrada exitosamente");
    // Actualizar los datos de la página
    if (onRefresh) {
      onRefresh();
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg border border-gray-200">
        <div className="p-8 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-2 text-gray-600 text-sm sm:text-base">Cargando cuentas...</p>
        </div>
      </div>
    );
  }

  if (rows.length === 0) {
    return (
      <div className="bg-white rounded-lg border border-gray-200">
        <div className="p-8 text-center">
          <p className="text-gray-600 text-sm sm:text-base">No se encontraron cuentas</p>
        </div>
      </div>
    );
  }

  // Vista de tarjetas para móviles
  const MobileCardView = () => (
    <div className='space-y-4 lg:hidden'>
      {rows.map((cuenta) => (
        <Card key={cuenta.id_cuenta} className='shadow-sm hover:shadow-md transition-shadow'>
          <CardContent className='p-4'>
            <div className='space-y-3'>
              {/* Header con código y estado */}
              <div className='flex items-center justify-between'>
                <h3 className='font-semibold text-lg text-gray-900'>{cuenta.codigo}</h3>
                {getEstadoBadge(cuenta.estado)}
              </div>

              {/* Información de la cuenta */}
              <div className='grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm'>
                <div className='flex items-center gap-2'>
                  <User className='text-gray-500 w-4 h-4' />
                  <span className='font-medium'>Cliente:</span>
                  <span className='text-gray-700'>{cuenta.cliente_nombre || `Cliente ${cuenta.cliente_id}`}</span>
                </div>

                <div className='flex items-center gap-2'>
                  <Bed className='text-gray-500 w-4 h-4' />
                  <span className='font-medium'>Habitación:</span>
                  <span className='text-gray-700'>{cuenta.habitacion_numero || cuenta.habitacion_id || "N/A"}</span>
                </div>

                <div className='flex items-center gap-2'>
                  <DollarSign className='text-gray-500 w-4 h-4' />
                  <span className='font-medium'>Sub Total:</span>
                  <span className='text-gray-700 font-semibold'>{formatCurrencyNoDecimals(cuenta.sub_total)}</span>
                </div>

                <div className='flex items-center gap-2'>
                  <Receipt className='text-gray-500 w-4 h-4' />
                  <span className='font-medium'>Comisión:</span>
                  <span className='text-gray-700'>{formatCurrencyNoDecimals(cuenta.total_comision)}</span>
                </div>

                <div className='flex items-center gap-2'>
                  <DollarSign className='text-gray-500 w-4 h-4' />
                  <span className='font-medium'>Total:</span>
                  <span className='text-gray-700 font-semibold'>{formatCurrencyNoDecimals(cuenta.total)}</span>
                </div>

                <div className='flex items-center gap-2'>
                  <Calendar className='text-gray-500 w-4 h-4' />
                  <span className='font-medium'>Fecha:</span>
                  <span className='text-gray-700'>{formatDate(cuenta.fecha_crea)}</span>
                </div>
              </div>

              {/* Acciones */}
              {hasAnyAction && (
                <div className='flex items-center gap-2 pt-2 border-t border-gray-100'>
                  {canViewDetails && (
                    <Button
                      variant='outline'
                      size='sm'
                      onClick={() => handleVerDetalles(cuenta.id_cuenta)}
                      className='flex-1 rounded-full hover:scale-105 transition-all duration-200 hover:bg-black hover:text-white text-xs'
                    >
                      <Eye className='w-3 h-3 mr-1' />
                      Ver Detalles
                    </Button>
                  )}

                  {cuenta.estado === 1 && (
                    <>
                      {canAddProducts && (
                        <Button
                          variant='outline'
                          size='sm'
                          onClick={() => handleAgregarProductos(cuenta.id_cuenta)}
                          className='flex-1 rounded-full hover:scale-105 transition-all duration-200 hover:bg-green-600 hover:text-white text-xs'
                        >
                          <ShoppingCart className='w-3 h-3 mr-1' />
                          Agregar
                        </Button>
                      )}

                      {canCobrar && (
                        <Button
                          variant='outline'
                          size='sm'
                          onClick={() => handleCobrarCuenta(cuenta.id_cuenta)}
                          className='flex-1 rounded-full hover:scale-105 transition-all duration-200 hover:bg-red-600 hover:text-white text-xs'
                        >
                          <CreditCard className='w-3 h-3 mr-1' />
                          Cobrar
                        </Button>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );

  // Vista de tabla para pantallas grandes
  const DesktopTableView = () => (
    <div className='hidden lg:block'>
      <div className="rounded-xl border bg-white overflow-hidden shadow-md">
        <div className="overflow-x-auto">
          <Table className="min-w-full text-sm bg-white rounded-xl overflow-hidden text-center">
            <TableHeader>
              <TableRow>
                <TableHead className="py-3 px-4 text-center text-sm text-gray-400">
                  Código
                </TableHead>
                <TableHead className="py-3 px-4 text-center text-sm text-gray-400">
                  Cliente
                </TableHead>
                <TableHead className="py-3 px-4 text-center text-sm text-gray-400">
                  Habitación
                </TableHead>
                <TableHead className="py-3 px-4 text-center text-sm text-gray-400">
                  Sub Total
                </TableHead>
                <TableHead className="py-3 px-4 text-center text-sm text-gray-400">
                  Comisión
                </TableHead>
                <TableHead className="py-3 px-4 text-center text-sm text-gray-400">
                  Total
                </TableHead>
                <TableHead className="py-3 px-4 text-center text-sm text-gray-400">
                  Estado
                </TableHead>
                <TableHead className="py-3 px-4 text-center text-sm text-gray-400">
                  Fecha
                </TableHead>
                <TableHead className="py-3 px-4 text-center text-sm text-gray-400">
                  Acciones
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((cuenta) => (
                <TableRow key={cuenta.id_cuenta} className="hover:bg-gray-50">
                  <TableCell className="py-3 px-4 text-center">
                    {cuenta.codigo}
                  </TableCell>
                  <TableCell className="py-3 px-4 text-center">
                    {cuenta.cliente_nombre || `Cliente ${cuenta.cliente_id}`}
                  </TableCell>
                  <TableCell className="py-3 px-4 text-center">
                    {cuenta.habitacion_numero || cuenta.habitacion_id || "N/A"}
                  </TableCell>
                  <TableCell className="py-3 px-4 text-center">
                    {formatCurrencyNoDecimals(cuenta.sub_total)}
                  </TableCell>
                  <TableCell className="py-3 px-4 text-center">
                    {formatCurrencyNoDecimals(cuenta.total_comision)}
                  </TableCell>
                  <TableCell className="py-3 px-4 text-center">
                    {formatCurrencyNoDecimals(cuenta.total)}
                  </TableCell>
                  <TableCell className="py-3 px-4 text-center">
                    {getEstadoBadge(cuenta.estado)}
                  </TableCell>
                  <TableCell className="py-3 px-4 text-center text-sm text-gray-500">
                    {formatDate(cuenta.fecha_crea)}
                  </TableCell>
                  <TableCell className="py-3 px-4 text-center">
                    {hasAnyAction && (
                      <div className="flex justify-center">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="bg-white hover:bg-gray-50 rounded-full"
                            >
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-40">
                            {canViewDetails && (
                              <DropdownMenuItem
                                className="cursor-pointer hover:text-blue-700 hover:bg-blue-50"
                                onClick={() => handleVerDetalles(cuenta.id_cuenta)}
                              >
                                <Eye className="h-4 w-4" />
                                Ver detalles
                              </DropdownMenuItem>
                            )}
                            {cuenta.estado === 1 && (
                              <>
                                {canAddProducts && (
                                  <DropdownMenuItem 
                                    className="cursor-pointer hover:text-green-700 hover:bg-green-50"
                                    onClick={() => handleAgregarProductos(cuenta.id_cuenta)}
                                  >
                                    <ShoppingCart className="h-4 w-4" />
                                    Agregar productos
                                  </DropdownMenuItem>
                                )}
                                {canCobrar && (
                                  <DropdownMenuItem 
                                    className="cursor-pointer hover:text-red-700 hover:bg-red-50"
                                    onClick={() => handleCobrarCuenta(cuenta.id_cuenta)}
                                  >
                                    <CreditCard className="h-4 w-4" />
                                    Cobrar
                                  </DropdownMenuItem>
                                )}
                              </>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );

  return (
    <>
      <MobileCardView />
      <DesktopTableView />

      {/* Modal de detalles */}
      <CuentaDetailModal
        open={detailModalOpen}
        onOpenChange={setDetailModalOpen}
        cuentaId={selectedCuentaId}
        onRefresh={onRefresh}
      />

      {/* Modal de Agregar Productos */}
      <AgregarProductosModal
        open={agregarProductosOpen}
        onOpenChange={setAgregarProductosOpen}
        cuentaId={selectedCuentaForProductos}
        onProductosAgregados={handleProductosAgregados}
      />

      {/* Modal de Cobrar Cuenta */}
      <CobrarCuentaModal
        open={cobrarCuentaOpen}
        onClose={() => setCobrarCuentaOpen(false)}
        cuenta={selectedCuentaForCobro}
        onCuentaCobrada={handleCuentaCobrada}
        onOrderStatusChange={onOrderStatusChange}
      />
    </>
  );
}
