'use client';
import React, { useState, useMemo } from 'react';
import useRooms from '@/hooks/habitaciones/useRooms';
import RoomFormDialog, { RoomForm } from '@/components/rooms/RoomFormDialog';
import RoomCard from '@/components/rooms/RoomCard';
import RoomTable from '@/components/rooms/RoomTable';
import { RoomFilters } from '@/components/rooms/RoomFilters';
import Paginate from '@/components/ui/paginate';
import { Button } from '@/components/ui/button';
import { Room } from '@/types/room';
import { Table, Grid3X3, Plus, Bed } from 'lucide-react';
import { PermissionGuard } from '@/components/auth/PermissionGuard';
import { useUserPermissions } from '@/hooks/auth/useUserPermissions';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  rectSortingStrategy
} from '@dnd-kit/sortable';


function toTitleCase(str: string) {
  return str.replace(/\w\S*/g, txt => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase());
}

const RoomsPage = () => {
  const {
    filteredRooms,
    isLoading,
    searchTerm,
    setSearchTerm,
    createRoom,
    updateRoom,
    deleteRoom,
    activateRoom,
    deactivateRoom,
    occupyRoom
  } = useRooms();

  const { hasPermission } = useUserPermissions();
  const canCreate = hasPermission('rooms', 'create');
  const canEdit = hasPermission('rooms', 'edit');
  const canDelete = hasPermission('rooms', 'delete');
  const canActivate = hasPermission('rooms', 'activate');
  const canDeactivate = hasPermission('rooms', 'deactivate');
  const canOccupy = hasPermission('rooms', 'occupy');
  const canLiberate = hasPermission('rooms', 'liberate');

  const [openDialog, setOpenDialog] = useState(false);
  const [editRoom, setEditRoom] = useState<Room | null>(null);
  const [showTableView, setShowTableView] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(8); // Valor inicial para modo cards
  const [filterStatus, setFilterStatus] = useState<number | null>(null);
  const [localRooms, setLocalRooms] = useState<Room[]>([]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Ajustar pageSize cuando cambia el modo de visualización
  React.useEffect(() => {
    if (showTableView) {
      setPageSize(5); // Valor por defecto para tabla
    } else {
      setPageSize(8); // Valor por defecto para cards
    }
    setPage(1); // Resetear a la primera página
  }, [showTableView]);

  const filteredByStatus = useMemo(() => {
    if (filterStatus === null) return filteredRooms;
    return filteredRooms.filter(room => room.status === filterStatus);
  }, [filteredRooms, filterStatus]);

  // Actualizar localRooms cuando filteredByStatus cambia
  React.useEffect(() => {
    setLocalRooms(filteredByStatus);
  }, [filteredByStatus]);

  const totalPages = Math.max(1, Math.ceil(localRooms.length / pageSize));
  const paginatedRooms = useMemo(() => {
    const start = (page - 1) * pageSize;
    return localRooms.slice(start, start + pageSize);
  }, [localRooms, page, pageSize]);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = localRooms.findIndex((r) => r.id === active.id);
      const newIndex = localRooms.findIndex((r) => r.id === over.id);

      const newRooms = arrayMove(localRooms, oldIndex, newIndex);
      setLocalRooms(newRooms);

      // TODO: Implementar reordenamiento en el backend
      // reorderRooms(newRooms);
    }
  };

  const handleCreate = async (form: RoomForm) => {
    await createRoom({
      name: toTitleCase(form.name),
      price: Number(form.price.replace(/\./g, '')),
      time: Number(form.time),
      comision_anfitriona: form.comision_anfitriona ? Number(form.comision_anfitriona.replace(/\./g, '')) : undefined
    });
    setOpenDialog(false);
  };

  const handleEdit = (room: Room) => {
    setEditRoom(room);
    setOpenDialog(true);
  };

  const handleUpdate = async (form: RoomForm) => {
    if (!editRoom) return;
    await updateRoom(editRoom.id, {
      name: toTitleCase(form.name),
      price: Number(form.price.replace(/\./g, '')),
      time: Number(form.time),
      comision_anfitriona: form.comision_anfitriona ? Number(form.comision_anfitriona.replace(/\./g, '')) : undefined
    });
    setEditRoom(null);
    setOpenDialog(false);
  };

  const handleDelete = async (room: Room) => {
    await deleteRoom(room.id);
  };

  const handleActivate = async (room: Room) => {
    await activateRoom(room.id);
  };

  const handleDeactivate = async (room: Room) => {
    await deactivateRoom(room.id);
  };

  const handleOccupy = async (room: Room) => {
    await occupyRoom(room.id);
  };

  const handleDialogClose = () => {
    setOpenDialog(false);
    setEditRoom(null);
  };

  const handleClearFilters = () => {
    setSearchTerm('');
    setFilterStatus(null);
    setPage(1);
  };

  return (
    <PermissionGuard module="rooms" action="view">
      <div className='flex flex-col gap-4 sm:gap-6 p-4 sm:p-6 lg:p-10 mt-4 sm:mt-6 lg:mt-10'>
      <div className='flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 sm:gap-6'>
        <h1 className='text-xl sm:text-2xl lg:text-3xl font-bold'>Habitaciones</h1>
        <div className='flex flex-col sm:flex-row gap-2 items-center'>
          <div className='flex gap-2 items-center'>
            <Button
              variant={showTableView ? 'default' : 'outline'}
              size='sm'
              onClick={() => setShowTableView(true)}
              className='rounded-full hover:scale-105 transition-all duration-200 text-xs sm:text-sm'
            >
              <Table className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
              Tabla
            </Button>
            <Button
              variant={!showTableView ? 'default' : 'outline'}
              size='sm'
              onClick={() => setShowTableView(false)}
              className='rounded-full hover:scale-105 transition-all duration-200 text-xs sm:text-sm'
            >
              <Grid3X3 className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
              Cards
            </Button>
          </div>
          {canCreate && (
            <Button
              variant='outline'
              size='sm'
              onClick={() => {
                setEditRoom(null);
                setOpenDialog(true);
              }}
              className='whitespace-nowrap inline-flex items-center bg-black text-white rounded-full hover:scale-105 transition-all duration-200 text-sm sm:text-base w-full sm:w-auto px-4 sm:px-6 py-2'
            >
              <Plus className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
              Nueva Habitacion
            </Button>
          )}
        </div>
      </div>

      <RoomFilters
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        filterStatus={filterStatus}
        setFilterStatus={setFilterStatus}
        onClearFilters={handleClearFilters}
        pageSize={pageSize}
        setPageSize={setPageSize}
        setPage={setPage}
        showTableView={showTableView}
      />

      {showTableView ? (
        <div className='mt-4 sm:mt-6'>
          <div className='overflow-x-auto'>
            <RoomTable
              rooms={paginatedRooms}
              onEdit={handleEdit}
              onDelete={handleDelete}
              onActivate={handleActivate}
              onDeactivate={handleDeactivate}
              onOccupy={handleOccupy}
              canEdit={canEdit}
              canDelete={canDelete}
              canActivate={canActivate}
              canDeactivate={canDeactivate}
              canOccupy={canOccupy}
              canLiberate={canLiberate}
            />
          </div>
          {totalPages > 1 && (
            <div className='flex justify-center mt-4 sm:mt-6'>
              <Paginate page={page} totalPages={totalPages} setPage={setPage} />
            </div>
          )}
        </div>
      ) : (
        <>
          {paginatedRooms.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20">
              <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mb-4">
                <Bed className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {localRooms.length === 0 ? 'No hay habitaciones' : 'Sin resultados'}
              </h3>
              <p className="text-gray-500 text-center mb-6 max-w-sm">
                {localRooms.length === 0 
                  ? "Crea tu primera habitación para comenzar"
                  : "Ajusta los filtros para ver más resultados"
                }
              </p>
              {localRooms.length === 0 && (
                <Button
                  onClick={() => {
                    setEditRoom(null);
                    setOpenDialog(true);
                  }}
                  className="bg-black text-white hover:bg-gray-800 rounded-xl px-6 py-2"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Nueva habitación
                </Button>
              )}
            </div>
          ) : (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={paginatedRooms.map(r => r.id)}
                strategy={rectSortingStrategy}
              >
                <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4 mt-4 sm:mt-6'>
                  {paginatedRooms.map(room => (
                    <RoomCard
                      key={room.id}
                      room={room}
                      onEdit={handleEdit}
                      onDelete={handleDelete}
                      onActivate={handleActivate}
                      onDeactivate={handleDeactivate}
                      onOccupy={handleOccupy}
                      isDraggable={true}
                      canEdit={canEdit}
                      canDelete={canDelete}
                      canActivate={canActivate}
                      canDeactivate={canDeactivate}
                      canOccupy={canOccupy}
                      canLiberate={canLiberate}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          )}
          {totalPages > 1 && paginatedRooms.length > 0 && (
            <div className='flex justify-center mt-4 sm:mt-6'>
              <Paginate page={page} totalPages={totalPages} setPage={setPage} />
            </div>
          )}
        </>
      )}
      <RoomFormDialog
        open={openDialog}
        onClose={handleDialogClose}
        onSubmit={editRoom ? handleUpdate : handleCreate}
        initialValues={editRoom}
        isLoading={isLoading}
      />
    </div>
    </PermissionGuard>
  );
};

export default RoomsPage;
