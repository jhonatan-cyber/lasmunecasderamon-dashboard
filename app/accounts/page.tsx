"use client";

import { useState } from "react";
import { useCuentas } from "@/hooks/useCuentas";
import { formatCurrencyNoDecimals } from "@/lib/formatters";
import { CuentaFilters, CuentaStatsCards, CuentaTable, CuentaHeader } from "@/components/cuentas";
import Paginate from "@/components/ui/paginate";
import { useCashRegisterStatus } from "@/hooks/useCashRegisterStatus";
import { AlertCircle } from "lucide-react";

export default function AccountsPage() {
  const { cuentas, loading, error, getCuentas } = useCuentas();
  const { hasOpenCaja, loading: cajaLoading } = useCashRegisterStatus();
  const [searchTerm, setSearchTerm] = useState("");
  const [rowsPerPage, setRowsPerPage] = useState(5);
  const [page, setPage] = useState(1);

  // Asegurar que cuentas sea siempre un array
  const cuentasData = cuentas || [];

  

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

      {!cajaLoading && !hasOpenCaja && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-center">
            <AlertCircle className="h-5 w-5 text-yellow-600 mr-2" />
            <div>
              <h3 className="text-sm font-medium text-yellow-800">
                Caja cerrada
              </h3>
              <p className="text-sm text-yellow-700 mt-1">
                No se pueden crear nuevas cuentas sin una caja abierta. Por favor, abra una caja en el módulo de caja primero.
              </p>
            </div>
          </div>
        </div>
      )}

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
