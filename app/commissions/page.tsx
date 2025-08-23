"use client"

import { useState } from "react"
import {
  CommissionsStatsCard,
  CommissionsFilters,
  CommissionsList,
} from "@/components/commissions"

import { useCommissions } from "@/hooks/useCommissions"

export default function CommissionsPage() {
  const {
    filteredCommissions,
    isLoading,
    searchTerm,
    setSearchTerm
  } = useCommissions()

  const [rowsPerPage, setRowsPerPage] = useState(5);
  const [page, setPage] = useState(1);

  const handleClearFilters = () => {
    setSearchTerm("")
    setRowsPerPage(5)
    setPage(1)
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "por_pagar":
        return "bg-yellow-100 text-yellow-800"
      case "pagado":
        return "bg-green-100 text-green-800"
      case "anulado":
        return "bg-red-100 text-red-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  // Paginación
  const totalPages = Math.ceil(filteredCommissions.length / rowsPerPage);
  const paginatedCommissions = filteredCommissions.slice(
    (page - 1) * rowsPerPage,
    page * rowsPerPage
  );

  return (
    <div className="p-4 sm:p-6 lg:p-10 space-y-4 sm:space-y-6 mt-4 sm:mt-6 lg:mt-10">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 sm:gap-6">
        <div>
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold tracking-tight">Comisiones</h1>
          <p className="text-sm sm:text-base text-muted-foreground">
            Gestiona las comisiones de los empleados
          </p>
        </div>
      </div>

      {/* Estadísticas */}
      <CommissionsStatsCard />

      {/* Filtros y búsqueda */}
      <CommissionsFilters
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        onClearFilters={handleClearFilters}
        rowsPerPage={rowsPerPage}
        setRowsPerPage={setRowsPerPage}
        setPage={setPage}
      />

      {/* Lista de comisiones */}
      <div className="overflow-x-auto">
        <CommissionsList
          loading={isLoading}
          paginatedCommissions={paginatedCommissions}
          getStatusColor={getStatusColor}
          page={page}
          setPage={setPage}
          totalPages={totalPages}
        />
      </div>
    </div>
  )
}
