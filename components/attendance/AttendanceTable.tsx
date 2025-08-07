// components/attendance/AttendanceTable.tsx
"use client";

import { useState } from "react";
import { Table } from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrencyNoDecimals } from "@/lib/formatters";
import useAsistencias from "@/hooks/useAsistencias";
import { Badge } from "../ui/badge";
import {
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faEye, faUser, faCalendar, faMoneyBill, faHandHoldingDollar, faMinusCircle, faCalculator } from "@fortawesome/free-solid-svg-icons";
import { AsistenciaResumen } from "@/types/asistencia";
import { Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import AttendanceDetailModal from "./AttendanceDetailModal";

interface AttendanceData {
  id_usuario: number;
  nick: string;
  nombre_completo: string;
  total_asistencias: number;
  sueldo_total: number;
  aporte_total: number;
  descuento_total: number;
  total_final: number;
}

export default function AttendanceTable() {
  const { data, loading, error } = useAsistencias();
  const [selectedUser, setSelectedUser] = useState<{
    id: number;
    name: string;
    nick: string;
  } | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  const handleViewDetail = (user: AttendanceData) => {
    setSelectedUser({
      id: user.id_usuario,
      name: user.nombre_completo,
      nick: user.nick
    });
    setIsDetailModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsDetailModalOpen(false);
    setSelectedUser(null);
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {[...Array(5)].map((_, i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-md bg-red-50 p-4">
        <p className="text-sm sm:text-base text-red-600">{error}</p>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <p className="text-sm sm:text-base text-gray-500">
        No hay datos de asistencia disponibles
      </p>
    );
  }

  // Vista de tarjetas para móviles
  const MobileCardView = () => (
    <div className='space-y-4 lg:hidden'>
      {data.map((item) => (
        <Card key={item.id_usuario} className='shadow-sm hover:shadow-md transition-shadow'>
          <CardContent className='p-4'>
            <div className='space-y-3'>
              {/* Header con nombre y nick */}
              <div className='flex items-center justify-between'>
                <h3 className='font-semibold text-lg text-gray-900'>{item.nombre_completo}</h3>
                <Badge variant="outline" className='text-xs'>
                  {item.nick}
                </Badge>
              </div>

              {/* Información de asistencia */}
              <div className='grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm'>
                <div className='flex items-center gap-2'>
                  <FontAwesomeIcon icon={faCalendar} className='text-gray-500 w-4' />
                  <span className='font-medium'>Asistencias:</span>
                  <Badge variant="success" className="bg-green-400 text-xs">
                    {item.total_asistencias} Días
                  </Badge>
                </div>

                <div className='flex items-center gap-2'>
                  <FontAwesomeIcon icon={faMoneyBill} className='text-gray-500 w-4' />
                  <span className='font-medium'>Sueldo:</span>
                  <span className='text-gray-700 font-semibold'>{formatCurrencyNoDecimals(item.sueldo_total)}</span>
                </div>

                <div className='flex items-center gap-2'>
                  <FontAwesomeIcon icon={faHandHoldingDollar} className='text-gray-500 w-4' />
                  <span className='font-medium'>Aporte:</span>
                  <span className='text-gray-700'>{formatCurrencyNoDecimals(item.aporte_total)}</span>
                </div>

                <div className='flex items-center gap-2'>
                  <FontAwesomeIcon icon={faMinusCircle} className='text-gray-500 w-4' />
                  <span className='font-medium'>Descuento:</span>
                  <span className='text-gray-700'>{formatCurrencyNoDecimals(item.descuento_total)}</span>
                </div>

                <div className='flex items-center gap-2 sm:col-span-2'>
                  <FontAwesomeIcon icon={faCalculator} className='text-gray-500 w-4' />
                  <span className='font-medium'>Total Final:</span>
                  <span className='text-gray-700 font-bold text-lg'>{formatCurrencyNoDecimals(item.total_final)}</span>
                </div>
              </div>

              {/* Acción */}
              <div className='flex justify-center pt-2 border-t border-gray-100'>
                <Button
                  variant='outline'
                  size='sm'
                  className='rounded-full hover:scale-105 transition-all duration-200 hover:bg-black hover:text-white text-xs'
                  onClick={() => handleViewDetail(item)}
                >
                  <FontAwesomeIcon icon={faEye} className='w-3 h-3 mr-1' />
                  Ver Detalle
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );

  // Vista de tabla para pantallas grandes
  const DesktopTableView = () => (
    <div className='hidden lg:block'>
      <div className="w-full overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-center text-sm">Nombre</TableHead>
              <TableHead className="text-center text-sm">Nick</TableHead>
              <TableHead className="text-center text-sm">Asistencias</TableHead>
              <TableHead className="text-center text-sm">Sueldo</TableHead>
              <TableHead className="text-center text-sm">Aporte</TableHead>
              <TableHead className="text-center text-sm">Descuento</TableHead>
              <TableHead className="text-center text-sm">Total</TableHead>
              <TableHead className="text-center text-sm">Detalle</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((item) => (
              <TableRow key={item.id_usuario}>
                <TableCell className="font-medium text-center text-sm">
                  {item.nombre_completo}
                </TableCell>
                <TableCell className="text-sm">{item.nick}</TableCell>
                <TableCell className="text-center">
                  <Badge variant="success" className="bg-green-400 text-xs">
                    {item.total_asistencias} Días
                  </Badge>
                </TableCell>
                <TableCell className="text-center text-sm">
                  {formatCurrencyNoDecimals(item.sueldo_total)}
                </TableCell>
                <TableCell className="text-center text-sm">
                  {formatCurrencyNoDecimals(item.aporte_total)}
                </TableCell>
                <TableCell className="text-center text-sm">
                  {formatCurrencyNoDecimals(item.descuento_total)}
                </TableCell>
                <TableCell className="text-center font-bold text-sm">
                  {formatCurrencyNoDecimals(item.total_final)}
                </TableCell>
                <TableCell className="text-center hover:text-blue-700 cursor-pointer">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleViewDetail(item)}
                    className="h-8 w-8 p-0 hover:bg-blue-50"
                  >
                    <FontAwesomeIcon icon={faEye} className="w-4 h-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );

  return (
    <>
      <MobileCardView />
      <DesktopTableView />
      
      {/* Modal de detalle */}
      {selectedUser && (
        <AttendanceDetailModal
          isOpen={isDetailModalOpen}
          onClose={handleCloseModal}
          userId={selectedUser.id}
          userName={selectedUser.name}
          userNick={selectedUser.nick}
        />
      )}
    </>
  );
}
