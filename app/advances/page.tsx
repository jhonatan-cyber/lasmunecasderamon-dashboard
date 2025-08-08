"use client"

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import AdvanceFormDialog from "@/components/advances/AdvanceFormDialog";
import AdvancesTable, { Advance } from "@/components/advances/AdvancesTable";
import AdvancesFilters from "@/components/advances/AdvancesFilters";
import { Plus } from "lucide-react";
import Paginate from "@/components/ui/paginate";

export default function AdvancesPage() {
  const [openDialog, setOpenDialog] = useState(false);
  const [advances, setAdvances] = useState<Advance[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [rowsPerPage, setRowsPerPage] = useState(5);
  const [page, setPage] = useState(1);


  // Filtro frontend por usuario
  const filteredAdvances = advances.filter((a) =>
    a.usuario.toLowerCase().includes(searchTerm.toLowerCase())
  );
  const paginatedAdvances = filteredAdvances.slice((page - 1) * rowsPerPage, page * rowsPerPage);

  // Fetch anticipos desde el backend
  const fetchAdvances = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/anticipos");
      const data = await res.json();
      if (res.ok && data.success) {
        setAdvances(
          (data.data || []).map((a: any) => ({
            id: a.id_anticipo,
            usuario: `${a.nombre} ${a.apellido}`.trim(),
            monto: Number(a.monto),
            fecha_crea: a.fecha_crea,
            estado: String(a.estado),
          }))
        );
      } else {
        setAdvances([]);
      }
    } catch {
      setAdvances([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdvances();
  }, []);

  const totalPages = Math.ceil(filteredAdvances.length / rowsPerPage) || 1;

  return (
    <div className="p-4 sm:p-6 lg:p-10 space-y-4 sm:space-y-6 mt-4 sm:mt-6 lg:mt-10">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 sm:gap-6 pt-4 sm:pt-8 px-4 sm:px-8">
        <div>
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900">Anticipos</h1>
          <p className="text-sm sm:text-base text-gray-600 mt-2">Gestiona los anticipos de sueldo del personal</p>
        </div>
        <AdvanceFormDialog open={openDialog} setOpen={setOpenDialog} onCreated={fetchAdvances}>
          <Button
            onClick={() => setOpenDialog(true)}
            className="w-full sm:w-auto rounded-full bg-black text-white px-4 sm:px-6 py-2 shadow hover:scale-105 transition-all duration-200 text-sm sm:text-base"
          >
            <Plus className='mr-2' />
            Nuevo
          </Button>
        </AdvanceFormDialog>
      </div>
      <div className="px-4 sm:px-8 mt-4 sm:mt-6">
        <AdvancesFilters
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
          rowsPerPage={rowsPerPage}
          setRowsPerPage={setRowsPerPage}
          setPage={setPage}
        />
        <div className="overflow-x-auto">
          <AdvancesTable advances={paginatedAdvances} loading={loading} />
        </div>
        {totalPages > 1 && (
          <div className="flex justify-center mt-4 sm:mt-6">
            <Paginate
              page={page}
              totalPages={totalPages}
              setPage={setPage}
            />
          </div>
        )}
      </div>
    </div>
  );
}
