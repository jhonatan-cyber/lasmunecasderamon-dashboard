import React, { useState, useMemo } from "react";
import { Room } from "@/types/room";
import { MoreVertical, Edit, Trash2, Check, Power, Bed } from "lucide-react";
import {
  Tooltip,
  TooltipProvider,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import ConfirmDeleteRoomDialog from "@/components/rooms/ConfirmDeleteRoomDialog";

interface RoomTableProps {
  rooms: Room[];
  onEdit: (room: Room) => void;
  onDelete: (room: Room) => void;
  onActivate: (room: Room) => void;
  onDeactivate: (room: Room) => void;
  onOccupy: (room: Room) => void;
}

const RoomTable: React.FC<RoomTableProps> = ({
  rooms,
  onEdit,
  onDelete,
  onActivate,
  onDeactivate,
  onOccupy,
}) => {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [roomToDelete, setRoomToDelete] = useState<Room | null>(null);

  return (
    <TooltipProvider>
      <div className='rounded-xl border bg-white overflow-hidden shadow-md'>
        <div className='overflow-x-auto'>
          <table className='min-w-full text-base bg-white rounded-xl overflow-hidden text-center'>
            <thead className='border-b last:border-b-0 bg-white group'>
              <tr>
                <th className='py-3 px-2 sm:px-4 text-center text-xs sm:text-sm text-gray-400'>#</th>
                <th className='py-3 px-2 sm:px-4 text-center text-xs sm:text-sm text-gray-400'>
                  Nombre
                </th>
                <th className='py-3 px-2 sm:px-4 text-center text-xs sm:text-sm text-gray-400'>
                  Precio
                </th>
                <th className='py-3 px-2 sm:px-4 text-center text-xs sm:text-sm text-gray-400'>
                  Tiempo
                </th>
                <th className='py-3 px-2 sm:px-4 text-center text-xs sm:text-sm text-gray-400'>
                  Comisión
                </th>
                <th className='py-3 px-2 sm:px-4 text-center text-xs sm:text-sm text-gray-400'>
                  Estado
                </th>
                <th className='py-3 px-2 sm:px-4 text-center text-xs sm:text-sm text-gray-400'>
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody>
              {rooms.length === 0 ? (
                <tr>
                  <td colSpan={7} className='py-8 text-center text-gray-500 text-sm sm:text-base'>
                    No hay habitaciones disponibles
                  </td>
                </tr>
              ) : (
                rooms.map((room, index) => (
                  <tr key={room.id} className='border-b last:border-b-0 hover:bg-gray-50'>
                    <td className='py-3 px-2 sm:px-4 text-center text-xs sm:text-sm text-gray-600'>
                      {index + 1}
                    </td>
                    <td className='py-3 px-2 sm:px-4 text-center'>
                      <span className='font-medium text-gray-900 text-xs sm:text-sm'>{room.name}</span>
                    </td>
                    <td className='py-3 px-2 sm:px-4 text-center'>
                      <span className='font-medium text-gray-900 text-xs sm:text-sm'>
                        ${room.price.toLocaleString('es-CL')}
                      </span>
                    </td>
                    <td className='py-3 px-2 sm:px-4 text-center'>
                      <span className='text-gray-600 text-xs sm:text-sm'>{room.time} min</span>
                    </td>
                    <td className='py-3 px-2 sm:px-4 text-center'>
                      <span className='text-gray-600 text-xs sm:text-sm'>
                        {room.comision_anfitriona ? `$${room.comision_anfitriona.toLocaleString('es-CL')}` : 'N/A'}
                      </span>
                    </td>
                    <td className='py-3 px-2 sm:px-4 text-center'>
                      <Badge
                        variant='secondary'
                        className={
                          room.status === 1
                            ? 'bg-green-100 text-green-800 text-xs sm:text-sm'
                            : room.status === 2
                            ? 'bg-red-100 text-red-800 text-xs sm:text-sm'
                            : 'bg-gray-100 text-gray-800 text-xs sm:text-sm'
                        }
                      >
                        {room.status === 1
                          ? 'Disponible'
                          : room.status === 2
                          ? 'Ocupada'
                          : 'Inactiva'}
                      </Badge>
                    </td>
                    <td className='py-3 px-2 sm:px-4 text-center'>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant='ghost'
                            size='icon'
                            className='bg-white hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 rounded-full hover:scale-105 transition-all duration-200'
                          >
                            <MoreVertical className='h-3 w-3 sm:h-4 sm:w-4' />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align='end'>
                          <DropdownMenuItem onClick={() => onEdit(room)}>
                            <Edit className='mr-2 h-3 w-3 sm:h-4 sm:w-4' />
                            Editar
                          </DropdownMenuItem>
                          {room.status === 0 ? (
                            <DropdownMenuItem onClick={() => onActivate(room)}>
                              <Check className='mr-2 h-3 w-3 sm:h-4 sm:w-4' />
                              Activar
                            </DropdownMenuItem>
                          ) : room.status === 1 ? (
                            <>
                              <DropdownMenuItem onClick={() => onOccupy(room)}>
                                <Bed className='mr-2 h-3 w-3 sm:h-4 sm:w-4' />
                                Ocupar
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => onDeactivate(room)}>
                                <Power className='mr-2 h-3 w-3 sm:h-4 sm:w-4' />
                                Desactivar
                              </DropdownMenuItem>
                            </>
                          ) : (
                            <DropdownMenuItem onClick={() => onActivate(room)}>
                              <Check className='mr-2 h-3 w-3 sm:h-4 sm:w-4' />
                              Liberar
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem
                            onClick={() => {
                              setRoomToDelete(room);
                              setConfirmOpen(true);
                            }}
                            className='text-red-600 focus:text-red-600'
                          >
                            <Trash2 className='mr-2 h-3 w-3 sm:h-4 sm:w-4' />
                            Eliminar
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
      <ConfirmDeleteRoomDialog
        open={confirmOpen}
        room={roomToDelete}
        onOpenChange={setConfirmOpen}
        onConfirm={(room) => onDelete(room)}
      />
    </TooltipProvider>
  );
};

export default RoomTable;
