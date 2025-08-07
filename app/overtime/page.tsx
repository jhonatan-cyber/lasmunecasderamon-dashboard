"use client";

import { useState } from "react";
import { useOvertime } from "@/hooks/useOvertime";
import { formatCurrencyNoDecimals } from "@/lib/formatters";
import OvertimeFilters from "@/components/overtime/OvertimeFilters";
import OvertimeStatsCards from "@/components/overtime/OvertimeStatsCards";
import OvertimeTable from "@/components/overtime/OvertimeTable";
import OvertimeFormDialog from "@/components/overtime/OvertimeFormDialog";
import Paginate from "@/components/ui/paginate";

import { Button } from "@/components/ui/button";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPlus } from "@fortawesome/free-solid-svg-icons";

export default function OvertimePage() {
  const { overtime, loading, error, getOvertime } = useOvertime();
  const [searchTerm, setSearchTerm] = useState("");
  const [rowsPerPage, setRowsPerPage] = useState(5);
  const [page, setPage] = useState(1);
  const [showFormDialog, setShowFormDialog] = useState(false);

  // Asegurar que overtime sea siempre un array
  const overtimeData = overtime || [];

  console.log("=== PÁGINA HORAS EXTRAS ===");
  console.log("Datos en la página:", overtimeData);
  console.log("Loading:", loading);
  console.log("Error:", error);
  console.log("===========================");

  const filteredOvertime = overtimeData.filter((overtime) => {
    return overtime.usuario.toLowerCase().includes(searchTerm.toLowerCase());
  });

  const totalPages = Math.ceil(filteredOvertime.length / rowsPerPage) || 1;
  const paginatedOvertime = filteredOvertime.slice(
    (page - 1) * rowsPerPage,
    page * rowsPerPage
  );

  const handleRefresh = () => {
    getOvertime();
  };

  const handleOpenFormDialog = () => {
    setShowFormDialog(true);
  };

  const handleCloseFormDialog = () => {
    setShowFormDialog(false);
  };

  return (
    <div className="p-4 sm:p-6 lg:p-10 space-y-4 sm:space-y-6 mt-4 sm:mt-6 lg:mt-10">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 sm:gap-6 mb-4 sm:mb-6">
        <div className="flex flex-col">
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold">Horas Extras</h1>
          <p className="text-sm sm:text-base text-gray-600">
            Gestiona las horas extras de los empleados.
          </p>
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <Button
            size="sm"
            className="whitespace-nowrap inline-flex items-center px-4 sm:px-6 py-2 bg-black text-white rounded-full hover:scale-105 duration-200 text-sm sm:text-base w-full sm:w-auto"
            onClick={handleOpenFormDialog}
          >
            <FontAwesomeIcon icon={faPlus} className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
            Nuevo
          </Button>
        </div>
      </div>

      <OvertimeStatsCards
        overtime={overtimeData}
        formatCurrency={formatCurrencyNoDecimals}
      />

      <OvertimeFilters
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        rowsPerPage={rowsPerPage}
        setRowsPerPage={setRowsPerPage}
        setPage={setPage}
        loading={loading}
        onRefresh={handleRefresh}
      />

      <div className="overflow-x-auto">
        <OvertimeTable
          loading={loading}
          rows={paginatedOvertime}
          rowsPerPage={rowsPerPage}
        />
      </div>

      {totalPages > 1 && (
        <div className="flex justify-center mt-4 sm:mt-6">
          <Paginate page={page} totalPages={totalPages} setPage={setPage} />
        </div>
      )}

      {/* Modal para agregar nueva hora extra */}
      <OvertimeFormDialog
        open={showFormDialog}
        onClose={handleCloseFormDialog}
        onSuccess={handleRefresh}
      />
    </div>
  );
}
