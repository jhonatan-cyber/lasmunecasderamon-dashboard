"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ServicioWithDetails } from "@/types/servicio";
import { formatCurrencyNoDecimals } from "@/lib/formatters";
import {
  Eye,
  PencilSimple,
  Trash,
  MoreVertical,
  Clock,
  Users,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useState } from "react";

interface ServicioTableProps {
  loading: boolean;
  rows: ServicioWithDetails[];
  rowsPerPage: number;
  onRefresh?: () => void;
}

export default function ServicioTable({
  loading,
  rows,
  rowsPerPage,
  onRefresh,
}: ServicioTableProps) {
  const [selectedServicioId, setSelectedServicioId] = useState<number | null>(null);

  const getEstadoBadge = (estado: number) => {
    switch (estado) {
      case 1:
        return <Badge className="bg-green-100 text-green-800">Activo</Badge>;
      case 0:
        return <Badge className="bg-gray-100 text-gray-800">Finalizado</Badge>;
      default:
        return <Badge className="bg-gray-100 text-gray-800">Desconocido</Badge>;
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const day = date.getDate();
    const month = date.toLocaleDateString("es-ES", { month: "long" });
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  };

  const formatTime = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

  const handleVerDetalles = (servicioId: number) => {
    setSelectedServicioId(servicioId);
    // Aquí puedes abrir un modal de detalles
    console.log("Ver detalles del servicio:", servicioId);
  };

  const handleEditar = (servicioId: number) => {
    console.log("Editar servicio:", servicioId);
  };

  const handleEliminar = async (servicioId: number) => {
    if (confirm("¿Estás seguro de que quieres eliminar este servicio?")) {
      try {
        const response = await fetch(`/api/servicios/${servicioId}`, {
          method: "DELETE",
        });

        if (response.ok) {
          if (onRefresh) {
            onRefresh();
          }
        } else {
          console.error("Error al eliminar servicio");
        }
      } catch (error) {
        console.error("Error al eliminar servicio:", error);
      }
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-gray-500">Cargando servicios...</div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border">
      <div className="overflow-x-auto">
        <Table>
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
                Precio Servicio
              </TableHead>
              <TableHead className="py-3 px-4 text-center text-sm text-gray-400">
                Precio Habitación
              </TableHead>
              <TableHead className="py-3 px-4 text-center text-sm text-gray-400">
                Total
              </TableHead>
              <TableHead className="py-3 px-4 text-center text-sm text-gray-400">
                Tiempo
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
            {rows.map((servicio) => (
              <TableRow key={servicio.id_servicio} className="hover:bg-gray-50">
                <TableCell className="py-3 px-4 text-center font-medium">
                  {servicio.codigo}
                </TableCell>
                <TableCell className="py-3 px-4 text-center">
                  {servicio.cliente_nombre || `Cliente ${servicio.cliente_id}`}
                </TableCell>
                <TableCell className="py-3 px-4 text-center">
                  {servicio.habitacion_numero || "N/A"}
                </TableCell>
                <TableCell className="py-3 px-4 text-center">
                  {formatCurrencyNoDecimals(servicio.precio_servicio)}
                </TableCell>
                <TableCell className="py-3 px-4 text-center">
                  {formatCurrencyNoDecimals(servicio.precio_habitacion)}
                </TableCell>
                <TableCell className="py-3 px-4 text-center font-semibold">
                  {formatCurrencyNoDecimals(servicio.total)}
                </TableCell>
                <TableCell className="py-3 px-4 text-center">
                  <div className="flex items-center justify-center gap-1">
                    <Clock className="text-gray-400" />
                    {formatTime(servicio.tiempo)}
                  </div>
                </TableCell>
                <TableCell className="py-3 px-4 text-center">
                  {getEstadoBadge(servicio.estado || 1)}
                </TableCell>
                <TableCell className="py-3 px-4 text-center text-sm text-gray-500">
                  {formatDate(servicio.fecha_crea || "")}
                </TableCell>
                <TableCell className="py-3 px-4 text-center">
                  <div className="flex justify-center">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="bg-white hover:bg-gray-50 rounded-full"
                        >
                          <MoreVertical />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-40">
                        <DropdownMenuItem
                          className="cursor-pointer hover:text-blue-700 hover:bg-blue-50"
                          onClick={() => handleVerDetalles(servicio.id_servicio!)}
                        >
                          <Eye />
                          Ver detalles
                        </DropdownMenuItem>
                        {servicio.estado === 1 && (
                          <>
                            <DropdownMenuItem 
                              className="cursor-pointer hover:text-green-700 hover:bg-green-50"
                              onClick={() => handleEditar(servicio.id_servicio!)}
                            >
                              <PencilSimple />
                              Editar
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              className="cursor-pointer hover:text-red-700 hover:bg-red-50"
                              onClick={() => handleEliminar(servicio.id_servicio!)}
                            >
                              <Trash />
                              Eliminar
                            </DropdownMenuItem>
                          </>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
} 