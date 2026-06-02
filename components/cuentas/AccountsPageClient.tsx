'use client';

import { useEffect, useState, useMemo } from 'react';
import { AlertCircle, Clock, CheckCircle } from 'lucide-react';
import { useCuentas } from '@/hooks/caja/useCuentas';
import useOrders from '@/hooks/servicios/useOrders';
import { useCashRegisterStatus } from '@/hooks/caja/useCashRegisterStatus';
import { formatCurrencyNoDecimals } from '@/lib/utils/formatters';
import { CuentaFilters, CuentaStatsCards, CuentaTable, CuentaHeader } from '@/components/cuentas';
import Paginate from '@/components/shared/Paginate';
import { PermissionGuard } from '@/components/auth/PermissionGuard';
import { ReportSkeleton } from '@/components/shared/Skeletons';

type TabType = 'pending' | 'paid';

export function AccountsPageClient() {
  const { cuentas, isLoading, getCuentas } = useCuentas();
  const { refetch: refetchOrders } = useOrders();
  const { hasOpenCaja, loading: cajaLoading } = useCashRegisterStatus();
  const [searchTerm, setSearchTerm] = useState('');
  const [rowsPerPage, setRowsPerPage] = useState(5);
  const [page, setPage] = useState(1);
  const [activeTab, setActiveTab] = useState<TabType>('pending');

  useEffect(() => {
    const handleCuentasUpdated = () => {
      getCuentas();
    };

    window.addEventListener('cuentasUpdated', handleCuentasUpdated);
    return () => window.removeEventListener('cuentasUpdated', handleCuentasUpdated);
  }, [getCuentas]);

  const cuentasData = useMemo(() => cuentas || [], [cuentas]);

  // Filter by tab and search
  const filteredCuentas = useMemo(() => {
    let result = cuentasData;

    // Filter by tab
    if (activeTab === 'pending') {
      result = result.filter(c => c.estado === 1);
    } else if (activeTab === 'paid') {
      result = result.filter(c => c.estado === 0);
    }

    // Filter by search term
    if (searchTerm) {
      result = result.filter(
        cuenta =>
          cuenta.cliente_nombre?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          cuenta.codigo.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    return result;
  }, [cuentasData, searchTerm, activeTab]);

  if (isLoading || cajaLoading) return <ReportSkeleton />;

  // Counts for tabs
  const pendingCount = cuentasData.filter(c => c.estado === 1).length;
  const paidCount = cuentasData.filter(c => c.estado === 0).length;

  const totalPages = Math.ceil(filteredCuentas.length / rowsPerPage) || 1;
  const paginatedCuentas = filteredCuentas.slice((page - 1) * rowsPerPage, page * rowsPerPage);

  return (
    <PermissionGuard module='accounts' action='view'>
      <div className='p-4 sm:p-6 lg:p-10 space-y-4 sm:space-y-6 mt-4 sm:mt-6 lg:mt-10'>
        <CuentaHeader loading={isLoading} onRefresh={() => getCuentas()} />
        <CuentaStatsCards cuentas={cuentasData} formatCurrency={formatCurrencyNoDecimals} />

        {!cajaLoading && hasOpenCaja === false && (
          <div className='bg-yellow-50 border border-yellow-200 rounded-lg p-4'>
            <div className='flex items-center'>
              <AlertCircle className='h-5 w-5 text-yellow-600 mr-2' />
              <div>
                <h3 className='text-sm font-medium text-yellow-800'>Caja cerrada</h3>
                <p className='text-sm text-yellow-700 mt-1'>
                  No se pueden crear nuevas cuentas sin una caja abierta. Por favor, abra una caja
                  en el modulo de caja primero.
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
          loading={isLoading}
          onRefresh={() => getCuentas()}
        />

        {/* Tabs */}
        <div className='flex justify-center gap-3 border-b pb-1'>
          <button
            onClick={() => {
              setActiveTab('pending');
              setPage(1);
            }}
            className={`flex items-center gap-2 px-5 py-2 text-sm font-semibold transition-all ${
              activeTab === 'pending'
                ? 'bg-amber-100 text-amber-700 rounded-full shadow-sm'
                : 'text-gray-500 hover:bg-gray-100 rounded-full'
            }`}
          >
            <Clock className='h-4 w-4' />
            Abiertas
            <span
              className={`ml-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold ${
                activeTab === 'pending' ? 'bg-amber-600 text-white' : 'bg-amber-100 text-amber-800'
              }`}
            >
              {pendingCount}
            </span>
          </button>
          <button
            onClick={() => {
              setActiveTab('paid');
              setPage(1);
            }}
            className={`flex items-center gap-2 px-5 py-2 text-sm font-semibold transition-all ${
              activeTab === 'paid'
                ? 'bg-green-100 text-green-700 rounded-full shadow-sm'
                : 'text-gray-500 hover:bg-gray-100 rounded-full'
            }`}
          >
            <CheckCircle className='h-4 w-4' />
            Cerradas
            <span
              className={`ml-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold ${
                activeTab === 'paid' ? 'bg-green-600 text-white' : 'bg-green-100 text-green-800'
              }`}
            >
              {paidCount}
            </span>
          </button>
        </div>

        <div className='overflow-x-auto'>
          <CuentaTable
            loading={isLoading}
            rows={paginatedCuentas}
            rowsPerPage={rowsPerPage}
            onRefresh={() => getCuentas()}
            onOrderStatusChange={refetchOrders}
          />
        </div>

        {totalPages > 1 && (
          <div className='flex justify-center'>
            <Paginate page={page} totalPages={totalPages} setPage={setPage} />
          </div>
        )}
      </div>
    </PermissionGuard>
  );
}
