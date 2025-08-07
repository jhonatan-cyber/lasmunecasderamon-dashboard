"use client";

import { useState } from "react";
import { useCuentas } from "@/hooks/useCuentas";
import { formatCurrencyNoDecimals } from "@/lib/formatters";
import { CuentaFilters, CuentaStatsCards, CuentaTable, CuentaHeader } from "@/components/cuentas";
import Paginate from "@/components/ui/paginate";

export default function AccountsPage() {
  const { cuentas, loading, error, getCuentas } = useCuentas();
  const [searchTerm, setSearchTerm] = useState("");
  const [rowsPerPage, setRowsPerPage] = useState(5);
  const [page, setPage] = useState(1);

  // Asegurar que cuentas sea siempre un array
  const cuentasData = cuentas || [];

  console.log("=== PÁGINA CUENTAS ===");
  console.log("Datos en la página:", cuentasData);
  console.log("Loading:", loading);
  console.log("Error:", error);
  console.log("===========================");

  const filteredCuentas = cuentasData.filter((cuenta) => {
    return cuenta.cliente_nombre?.toLowerCase().includes(searchTerm.toLowerCase()) ||
           cuenta.codigo.toLowerCase().includes(searchTerm.toLowerCase());
  });

  const totalPages = Math.ceil(filteredCuentas.length / rowsPerPage) || 1;
  const paginatedCuentas = filteredCuentas.slice(
    (page - 1) * rowsPerPage,
    page * rowsPerPage
  );

  const handleRefresh = () => {
    getCuentas();
  };

  return (
    <div className="p-4 sm:p-6 lg:p-10 space-y-4 sm:space-y-6 mt-4 sm:mt-6 lg:mt-10">
      <CuentaHeader
        loading={loading}
        onRefresh={handleRefresh}
      />

      <CuentaStatsCards
        cuentas={cuentasData}
        formatCurrency={formatCurrencyNoDecimals}
      />

      <CuentaFilters
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        rowsPerPage={rowsPerPage}
        setRowsPerPage={setRowsPerPage}
        setPage={setPage}
        loading={loading}
        onRefresh={handleRefresh}
      />

      <div className="overflow-x-auto">
        <CuentaTable
          loading={loading}
          rows={paginatedCuentas}
          rowsPerPage={rowsPerPage}
          onRefresh={handleRefresh}
        />
      </div>

      {totalPages > 1 && (
        <div className="flex justify-center">
          <Paginate page={page} totalPages={totalPages} setPage={setPage} />
        </div>
      )}
    </div>
  );
}
