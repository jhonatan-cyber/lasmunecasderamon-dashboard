import React from "react";
import { Room } from "@/types/room";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Bed, Ruler, MoreVertical, Edit, Trash2, Check, Power } from "lucide-react";
import { TooltipProvider, Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { CardContainer, CardBody } from '@/components/ui/3d-card';

const statusColors: Record<number, string> = {
  1: "bg-green-100 text-green-800", // Disponible
  2: "bg-yellow-100 text-yellow-800", // Ocupada
  0: "bg-gray-200 text-gray-600", // Inactiva
};
const statusLabels: Record<number, string> = {
  1: "Disponible",
  2: "Ocupada",
  0: "Inactiva",
};

const RoomCard: React.FC<{
  room: Room;
  onEdit: (room: Room) => void;
  onDelete: (room: Room) => void;
  onActivate: (room: Room) => void;
  onDeactivate: (room: Room) => void;
  onOccupy: (room: Room) => void;
}> = ({ room, onEdit, onDelete, onActivate, onDeactivate, onOccupy }) => {
  return (
    <CardContainer className='inter-var'>
      <CardBody className='bg-white relative group/card hover:shadow-2xl hover:shadow-emerald-500/[0.1] dark:bg-black dark:border-white/[0.2] border-black/[0.1] w-auto h-auto rounded-xl p-4 sm:p-6 border'>
        {/* Header */}
        <div className='flex items-start justify-between pb-3'>
          <div>
            <div className='text-sm sm:text-lg font-semibold text-neutral-600 dark:text-white flex items-center gap-2'>
              <Bed className="text-blue-500 text-xs sm:text-sm" />
              {room.name}
            </div>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="bg-white hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 rounded-full hover:scale-105 transition-all duration-200"
              >
                <MoreVertical className="h-3 w-3 sm:h-4 sm:w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {room.status === 1 && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <DropdownMenuItem onClick={() => onEdit(room)} className="cursor-pointer group">
                        <Edit className="mr-2 text-blue-600" />
                        <span className="group-hover:text-blue-600 transition-colors">Editar</span>
                      </DropdownMenuItem>
                    </TooltipTrigger>
                    <TooltipContent>Editar habitación</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
              {room.status === 1 && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <DropdownMenuItem onClick={() => onOccupy(room)} className="cursor-pointer group">
                        <Bed className="mr-2 text-yellow-600" />
                        <span className="group-hover:text-yellow-600 transition-colors">Ocupar</span>
                      </DropdownMenuItem>
                    </TooltipTrigger>
                    <TooltipContent>Ocupar habitación</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
              {room.status === 1 && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <DropdownMenuItem onClick={() => onDeactivate(room)} className="cursor-pointer group">
                        <Power className="mr-2 text-orange-600" />
                        <span className="group-hover:text-orange-600 transition-colors">Desactivar</span>
                      </DropdownMenuItem>
                    </TooltipTrigger>
                    <TooltipContent>Desactivar habitación</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
              {room.status === 0 && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <DropdownMenuItem onClick={() => onActivate(room)} className="cursor-pointer group">
                        <Check className="mr-2 text-green-600" />
                        <span className="group-hover:text-green-600 transition-colors">Activar</span>
                      </DropdownMenuItem>
                    </TooltipTrigger>
                    <TooltipContent>Activar habitación</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <DropdownMenuItem onClick={() => onDelete(room)} className="cursor-pointer group">
                      <Trash2 className="mr-2 text-red-600" />
                      <span className="group-hover:text-red-600 transition-colors">Eliminar</span>
                    </DropdownMenuItem>
                  </TooltipTrigger>
                  <TooltipContent>Eliminar habitación</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Content */}
        <div className='space-y-3 sm:space-y-4'>
          {/* Status badges */}
          <div className="flex items-center justify-between">
            <Badge variant="outline" className="bg-blue-100 text-blue-800 text-xs sm:text-sm">Habitación</Badge>
            <Badge variant="secondary" className={`${statusColors[room.status] || "bg-gray-100 text-gray-600"} text-xs sm:text-sm`}>
              {statusLabels[room.status] || "-"}
            </Badge>
          </div>

          {/* Room details grid */}
          <div className="grid grid-cols-2 gap-2 text-xs sm:text-sm">
            <div className="text-center">
              <div className="font-medium flex items-center justify-center gap-1">
                <Bed className="text-xs sm:text-sm" />
                {room.time} min
              </div>
              <div className="text-xs text-gray-500 dark:text-neutral-300">Tiempo</div>
            </div>
            <div className="text-center">
              <div className="font-medium flex items-center justify-center gap-1">
                <Ruler className="text-xs sm:text-sm" />
                ${room.price.toLocaleString('es-CL')}
              </div>
              <div className="text-xs text-gray-500 dark:text-neutral-300">Precio</div>
            </div>
          </div>

          {/* Footer info */}
          <div className="flex justify-end pt-3 border-t border-gray-200 dark:border-gray-700">
            <span className="text-xs text-gray-500 dark:text-neutral-400">
              {room.fecha_crea
                ? `Creada: ${new Date(room.fecha_crea).toLocaleDateString('es-ES', { day: '2-digit', month: 'long', year: 'numeric' })}`
                : ''}
            </span>
          </div>
        </div>
      </CardBody>
    </CardContainer>
  );
};

export default RoomCard; 