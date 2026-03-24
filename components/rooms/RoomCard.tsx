import React, { useState } from "react";
import { Room } from "@/types/room";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Bed, Clock, DollarSign, Percent, MoreVertical, Edit, Trash2, Check, Power, Users, GripVertical } from "lucide-react";
import ConfirmDeleteRoomDialog from "@/components/rooms/ConfirmDeleteRoomDialog";
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { formatCurrencyCLP } from "@/lib/formatters";
import { formatShortDmyDateEs } from "@/lib/calendarUtils";

const RoomCard: React.FC<{
  room: Room;
  onEdit: (room: Room) => void;
  onDelete: (room: Room) => void;
  onActivate: (room: Room) => void;
  onDeactivate: (room: Room) => void;
  onOccupy: (room: Room) => void;
  isDraggable?: boolean;
  canEdit?: boolean;
  canDelete?: boolean;
  canActivate?: boolean;
  canDeactivate?: boolean;
  canOccupy?: boolean;
  canLiberate?: boolean;
}> = ({ 
  room, 
  onEdit, 
  onDelete, 
  onActivate, 
  onDeactivate, 
  onOccupy, 
  isDraggable = false,
  canEdit = true,
  canDelete = true,
  canActivate = true,
  canDeactivate = true,
  canOccupy = true,
  canLiberate = true
}) => {
  const [confirmOpen, setConfirmOpen] = useState(false);
  
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ 
    id: room.id,
    disabled: !isDraggable
  });

  const style = isDraggable ? {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  } : {};
  
  const getStatusColor = () => {
    switch (room.status) {
      case 1: return 'bg-emerald-500';
      case 2: return 'bg-amber-500';
      default: return 'bg-gray-400';
    }
  };

  const getStatusText = () => {
    switch (room.status) {
      case 1: return 'Disponible';
      case 2: return 'Ocupada';
      default: return 'Inactiva';
    }
  };

  return (
    <div className="group" ref={isDraggable ? setNodeRef : undefined} style={style}>
      <div className="bg-white border border-gray-200 rounded-xl p-3 sm:p-4 hover:shadow-lg transition-all duration-300 hover:-translate-y-1 relative overflow-hidden">
        {/* Status indicator */}
        <div className={`absolute top-0 left-0 right-0 h-1 ${getStatusColor()}`} />
        
        {/* Header */}
        <div className="flex items-start justify-between mb-3 sm:mb-4">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            {/* Drag handle en lugar del ícono de cama */}
            {isDraggable ? (
              <div
                {...attributes}
                {...listeners}
                className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0 cursor-grab active:cursor-grabbing hover:bg-gray-200 transition-colors"
              >
                <GripVertical className="w-4 h-4 text-gray-600" />
              </div>
            ) : (
              <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <Bed className="w-4 h-4 text-gray-600" />
              </div>
            )}
            <div className="min-w-0 flex-1">
              <h3 className="font-semibold text-gray-900 text-sm sm:text-base truncate">{room.name}</h3>
              <Badge 
                variant="secondary" 
                className={`mt-1 text-xs font-medium ${
                  room.status === 1 ? 'bg-emerald-100 text-emerald-700' :
                  room.status === 2 ? 'bg-amber-100 text-amber-700' :
                  'bg-gray-100 text-gray-600'
                }`}
              >
                {getStatusText()}
              </Badge>
            </div>
          </div>
          
          {/* Solo mostrar el menú si tiene al menos un permiso */}
          {(canEdit || canDelete || canActivate || canDeactivate || canOccupy || canLiberate) && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className={`transition-opacity h-7 w-7 rounded-lg flex-shrink-0 ${isDraggable ? 'opacity-0 group-hover:opacity-100' : ''}`}
                >
                  <MoreVertical className="h-3 w-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-36">
                {canEdit && (
                  <DropdownMenuItem onClick={() => onEdit(room)} className="text-xs">
                    <Edit className="mr-2 h-3 w-3" />
                    Editar
                  </DropdownMenuItem>
                )}
                
                {room.status === 1 && canOccupy && (
                  <DropdownMenuItem onClick={() => onOccupy(room)} className="text-xs">
                    <Users className="mr-2 h-3 w-3" />
                    Ocupar
                  </DropdownMenuItem>
                )}
                
                {room.status === 1 && canDeactivate ? (
                  <DropdownMenuItem onClick={() => onDeactivate(room)} className="text-xs">
                    <Power className="mr-2 h-3 w-3" />
                    Desactivar
                  </DropdownMenuItem>
                ) : (room.status === 0 && canActivate) || (room.status === 2 && canLiberate) ? (
                  <DropdownMenuItem onClick={() => onActivate(room)} className="text-xs">
                    <Check className="mr-2 h-3 w-3" />
                    {room.status === 2 ? 'Liberar' : 'Activar'}
                  </DropdownMenuItem>
                ) : null}
                
                {canDelete && (
                  <DropdownMenuItem 
                    onClick={() => setConfirmOpen(true)} 
                    className="text-red-600 focus:text-red-600 text-xs"
                  >
                    <Trash2 className="mr-2 h-3 w-3" />
                    Eliminar
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>

        {/* Info Grid */}
        <div className="grid grid-cols-2 gap-2 sm:gap-3 mb-3 sm:mb-4">
          <div className="bg-gray-50 rounded-lg p-2 sm:p-3 min-w-0">
            <div className="flex items-center gap-1 text-gray-600 mb-1">
              <DollarSign className="w-3 h-3 flex-shrink-0" />
              <span className="text-xs font-medium truncate">Precio</span>
            </div>
            <p className="text-sm sm:text-base font-bold text-gray-900 truncate">
              {formatCurrencyCLP(room.price)}
            </p>
          </div>
          
          <div className="bg-gray-50 rounded-lg p-2 sm:p-3 min-w-0">
            <div className="flex items-center gap-1 text-gray-600 mb-1">
              <Percent className="w-3 h-3 flex-shrink-0" />
              <span className="text-xs font-medium truncate">Comisión</span>
            </div>
            <p className="text-sm sm:text-base font-bold text-gray-900 truncate">
              {room.comision_anfitriona ? formatCurrencyCLP(room.comision_anfitriona) : '—'}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 sm:gap-3 mb-3 sm:mb-4">
          <div className="bg-gray-50 rounded-lg p-2 sm:p-3 min-w-0">
            <div className="flex items-center gap-1 text-gray-600 mb-1">
              <Clock className="w-3 h-3 flex-shrink-0" />
              <span className="text-xs font-medium truncate">Duración</span>
            </div>
            <p className="text-sm sm:text-base font-bold text-gray-900 truncate">{room.time} min</p>
          </div>
          
          <div className="bg-gray-50 rounded-lg p-2 sm:p-3 min-w-0">
            <div className="flex items-center gap-1 text-gray-600 mb-1">
              <Bed className="w-3 h-3 flex-shrink-0" />
              <span className="text-xs font-medium truncate">ID</span>
            </div>
            <p className="text-sm sm:text-base font-bold text-gray-900 truncate">#{room.id}</p>
          </div>
        </div>

        {/* Footer */}
        {room.fecha_crea && (
          <div className="pt-2 sm:pt-3 border-t border-gray-100">
            <p className="text-xs text-gray-500 text-center truncate">
              {formatShortDmyDateEs(room.fecha_crea)}
            </p>
          </div>
        )}
      </div>
      
      <ConfirmDeleteRoomDialog
        open={confirmOpen}
        room={room}
        onOpenChange={setConfirmOpen}
        onConfirm={(r) => onDelete(r)}
      />
    </div>
  );
};

export default RoomCard; 
