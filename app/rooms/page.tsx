'use client';
import React, { useState, useMemo } from 'react';
import useRooms from '@/hooks/useRooms';
import RoomFormDialog, { RoomForm } from '@/components/rooms/RoomFormDialog';
import RoomCard from '@/components/rooms/RoomCard';
import RoomTable from '@/components/rooms/RoomTable';
import { RoomFilters } from '@/components/rooms/RoomFilters';
import Paginate from '@/components/ui/paginate';
import { Button } from '@/components/ui/button';
import { Room } from '@/types/room';
import { Table, Grid3X3, Plus } from 'lucide-react';

const pageSizes = [8, 12, 24, 48];

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

  const [openDialog, setOpenDialog] = useState(false);
  const [editRoom, setEditRoom] = useState<Room | null>(null);
  const [showTableView, setShowTableView] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(8); // Valor inicial para modo cards
  const [filterStatus, setFilterStatus] = useState<number | null>(null);

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

  const totalPages = Math.max(1, Math.ceil(filteredByStatus.length / pageSize));
  const paginatedRooms = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredByStatus.slice(start, start + pageSize);
  }, [filteredByStatus, page, pageSize]);

  const handleCreate = async (form: RoomForm) => {
    await createRoom({
      name: toTitleCase(form.name),
      price: Number(form.price),
      time: Number(form.time)
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
      price: Number(form.price),
      time: Number(form.time)
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
    <div className='container mx-auto py-4 sm:py-6 lg:py-8 mt-4 sm:mt-6 lg:mt-10 px-4 sm:px-6'>
      <div className='flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4 sm:mb-6'>
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
            Nueva
          </Button>
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
          <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6 mt-4 sm:mt-6'>
            {paginatedRooms.map(room => (
              <RoomCard
                key={room.id}
                room={room}
                onEdit={handleEdit}
                onDelete={handleDelete}
                onActivate={handleActivate}
                onDeactivate={handleDeactivate}
                onOccupy={handleOccupy}
              />
            ))}
          </div>
          {totalPages > 1 && (
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
  );
};

export default RoomsPage;
