'use client';

import React, { useState, useMemo, useEffect } from 'react';
import useRooms from '@/hooks/habitaciones/useRooms';
import { type RoomFormValues } from '@/hooks/personal/useRoomForm';
import RoomTable from '@/components/rooms/RoomTable';
import { RoomFilters } from '@/components/rooms/RoomFilters';
import Paginate from '@/components/shared/Paginate';
import { Room } from '@/types/room';
import { PermissionGuard } from '@/components/auth/PermissionGuard';
import { useUserPermissions } from '@/hooks/auth/useUserPermissions';
import { RoomsSkeleton } from '@/components/shared/Skeletons';
import { toTitleCase } from '@/lib/utils/formatters';

// Nuevos componentes refactorizados
import { RoomsHeader } from '@/components/rooms/RoomsHeader';
import { RoomGridView } from '@/components/rooms/RoomGridView';
import { RoomFormDialog } from '@/components/rooms/RoomFormDialog';

const RoomsPage = () => {
  const {
    filteredRooms,
    isLoading,
    isMutating,
    searchTerm,
    setSearchTerm,
    createRoom,
    updateRoom,
    deleteRoom,
    activateRoom,
    deactivateRoom,
    occupyRoom,
    reorderRooms
  } = useRooms();

  const { hasPermission } = useUserPermissions();
  const permissions = {
    canCreate: hasPermission('rooms', 'create'),
    canEdit: hasPermission('rooms', 'edit'),
    canDelete: hasPermission('rooms', 'delete'),
    canActivate: hasPermission('rooms', 'activate'),
    canDeactivate: hasPermission('rooms', 'deactivate'),
    canOccupy: hasPermission('rooms', 'occupy'),
    canLiberate: hasPermission('rooms', 'liberate'),
  };

  const [openDialog, setOpenDialog] = useState(false);
  const [editRoom, setEditRoom] = useState<Room | null>(null);
  const [showTableView, setShowTableView] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(8);
  const [filterStatus, setFilterStatus] = useState<number | null>(null);
  const [sortBy, setSortBy] = useState('display_order');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [localRooms, setLocalRooms] = useState<Room[]>([]);

  useEffect(() => {
    const targetSize = showTableView ? 5 : 8;
    setPageSize(prev => (prev !== targetSize ? targetSize : prev));
    setPage(1);
  }, [showTableView]);

  const filteredByStatus = useMemo(() => {
    let result = filteredRooms;
    if (filterStatus !== null) {
      result = result.filter(room => room.status === filterStatus);
    }
    // Aplicar ordenamiento
    result = [...result].sort((a, b) => {
      let comparison = 0;
      switch (sortBy) {
        case 'nombre':
          comparison = (a.name || '').localeCompare(b.name || '');
          break;
        case 'precio':
          comparison = (a.price || 0) - (b.price || 0);
          break;
        case 'tiempo':
          comparison = (a.time || 0) - (b.time || 0);
          break;
        case 'display_order':
          comparison = (a.display_order || 0) - (b.display_order || 0);
          break;
        case 'created_at':
          comparison = new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime();
          break;
        default:
          comparison = 0;
      }
      return sortOrder === 'asc' ? comparison : -comparison;
    });
    return result;
  }, [filteredRooms, filterStatus, sortBy, sortOrder]);

  useEffect(() => {
    setLocalRooms(prev => (prev === filteredByStatus ? prev : filteredByStatus));
  }, [filteredByStatus]);

  const totalPages = Math.max(1, Math.ceil(localRooms.length / pageSize));
  const paginatedRooms = useMemo(() => {
    const start = (page - 1) * pageSize;
    return localRooms.slice(start, start + pageSize);
  }, [localRooms, page, pageSize]);

  const handleCreate = async (form: RoomFormValues) => {
    await createRoom({
      name: toTitleCase(form.name),
      price: Number(form.price.replace(/\./g, '')),
      time: Number(form.time),
      comision_anfitriona: form.comision_anfitriona
        ? Number(form.comision_anfitriona.replace(/\./g, ''))
        : undefined
    });
    setOpenDialog(false);
  };

  const handleEdit = (room: Room) => {
    setEditRoom(room);
    setOpenDialog(true);
  };

  const handleUpdate = async (form: RoomFormValues) => {
    if (!editRoom) return;
    await updateRoom(editRoom.id, {
      name: toTitleCase(form.name),
      price: Number(form.price.replace(/\./g, '')),
      time: Number(form.time),
      comision_anfitriona: form.comision_anfitriona
        ? Number(form.comision_anfitriona.replace(/\./g, ''))
        : undefined
    });
    setEditRoom(null);
    setOpenDialog(false);
  };

  const handleActivate = async (room: Room) => {
    const isLiberate = room.status === 2;
    await activateRoom(room.id, isLiberate ? 'liberate' : 'activate');
  };

  const handleDialogClose = () => {
    setOpenDialog(false);
    setEditRoom(null);
  };

  const handleClearFilters = () => {
    setSearchTerm('');
    setFilterStatus(null);
    setSortBy('display_order');
    setSortOrder('asc');
    setPage(1);
  };

  if (isLoading) return <RoomsSkeleton />;

  return (
    <PermissionGuard module='rooms' action='view'>
      <div className='flex flex-col gap-4 sm:gap-6 p-4 sm:p-6 lg:p-10 mt-4 sm:mt-6 lg:mt-10'>
        <RoomsHeader 
          showTableView={showTableView} 
          setShowTableView={setShowTableView} 
          canCreate={permissions.canCreate}
          onNew={() => { setEditRoom(null); setOpenDialog(true); }}
        />

        <RoomFilters
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
          filterStatus={filterStatus}
          setFilterStatus={setFilterStatus}
          sortBy={sortBy}
          setSortBy={setSortBy}
          sortOrder={sortOrder}
          setSortOrder={setSortOrder}
          onClearFilters={handleClearFilters}
          pageSize={pageSize}
          setPageSize={setPageSize}
          setPage={setPage}
          showTableView={showTableView}
        />

        {showTableView ? (
          <div className='mt-4 sm:mt-6'>
            <RoomTable
              rooms={paginatedRooms}
              onEdit={handleEdit}
              onDelete={room => deleteRoom(room.id)}
              onActivate={handleActivate}
              onDeactivate={room => deactivateRoom(room.id)}
              onOccupy={room => occupyRoom(room.id)}
              isMutating={isMutating}
              {...permissions}
              currentPage={page}
              pageSize={pageSize}
            />
            {totalPages > 1 && (
              <div className='flex justify-center mt-4 sm:mt-6'>
                <Paginate page={page} totalPages={totalPages} setPage={setPage} />
              </div>
            )}
          </div>
        ) : (
          <div className='mt-4 sm:mt-6'>
            <RoomGridView 
              rooms={paginatedRooms}
              localRooms={localRooms}
              setLocalRooms={setLocalRooms}
              reorderRooms={reorderRooms}
              onEdit={handleEdit}
              onDelete={room => deleteRoom(room.id)}
              onActivate={handleActivate}
              onDeactivate={room => deactivateRoom(room.id)}
              onOccupy={room => occupyRoom(room.id)}
              isMutating={isMutating}
              {...permissions}
              onNew={() => { setEditRoom(null); setOpenDialog(true); }}
            />
            {totalPages > 1 && paginatedRooms.length > 0 && (
              <div className='flex justify-center mt-4 sm:mt-6'>
                <Paginate page={page} totalPages={totalPages} setPage={setPage} />
              </div>
            )}
          </div>
        )}

        <RoomFormDialog 
          open={openDialog}
          onClose={handleDialogClose}
          onSubmit={editRoom ? handleUpdate : handleCreate}
          room={editRoom}
          isMutating={isMutating}
        />
      </div>
    </PermissionGuard>
  );
};

export default RoomsPage;
