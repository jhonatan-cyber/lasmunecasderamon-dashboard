'use client';
import { StatusTabs } from '@/components/shared/StatusTabs';

import { useEffect, useState, useMemo } from 'react';
import { Clock, CheckCircle } from 'lucide-react';
import { useCuentas } from '@/hooks/cash-register/useCuentas';
import useOrders from '@/hooks/orders/useOrders';
import { useCashRegisterStatus } from '@/hooks/cash-register/useCashRegisterStatus';
import { formatCurrencyNoDecimals } from '@/lib/utils/formatters';
import { CuentaFilters, CuentaStatsCards, CuentaTable, CuentaHeader } from '@/components/accounts';
import { CajaStatusBanner } from '@/components/sales/CajaStatusBanner';
import Paginate from '@/components/shared/Paginate';
import { PermissionGuard } from '@/components/auth/PermissionGuard';
import { Skeleton as BoneyardSkeleton } from 'boneyard-js/react';

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

  const filteredCuentas = useMemo(() => {
    let result = cuentasData;

    if (activeTab === 'pending') {
      result = result.filter(c => c.estado === 1);
    } else if (activeTab === 'paid') {
      result = result.filter(c => c.estado === 0);
    }

    if (searchTerm) {
      result = result.filter(
        cuenta =>
          cuenta.cliente_nombre?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          cuenta.codigo.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    return result;
  }, [cuentasData, searchTerm, activeTab]);

  // ponytail: loading handled via BoneyardSkeleton below

  const pendingCount = cuentasData.filter(c => c.estado === 1).length;
  const paidCount = cuentasData.filter(c => c.estado === 0).length;

  const totalPages = Math.ceil(filteredCuentas.length / rowsPerPage) || 1;
  const paginatedCuentas = filteredCuentas.slice((page - 1) * rowsPerPage, page * rowsPerPage);

  return (
    <PermissionGuard module='accounts' action='view'>
      <BoneyardSkeleton name='accounts-main' loading={isLoading || cajaLoading}>
        <div className='p-4 sm:p-6 lg:p-10 space-y-4 sm:space-y-6 mt-4 sm:mt-6 lg:mt-10'>
          <CajaStatusBanner entityName='cuentas' />

          <CuentaHeader loading={isLoading} onRefresh={() => getCuentas()} />
          <CuentaStatsCards cuentas={cuentasData} formatCurrency={formatCurrencyNoDecimals} />

          <CuentaFilters
            searchTerm={searchTerm}
            setSearchTerm={setSearchTerm}
            rowsPerPage={rowsPerPage}
            setRowsPerPage={setRowsPerPage}
            setPage={setPage}
            loading={isLoading}
            onRefresh={() => getCuentas()}
          />

          {}
          <StatusTabs
            items={[
              {
                label: 'Abiertas',
                count: pendingCount,
                active: activeTab === 'pending',
                onSelect: () => {
                  setActiveTab('pending');
                  setPage(1);
                },
                tone: 'warning'
              },
              {
                label: 'Cerradas',
                count: paidCount,
                active: activeTab === 'paid',
                onSelect: () => {
                  setActiveTab('paid');
                  setPage(1);
                },
                tone: 'success'
              }
            ]}
          />

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
      </BoneyardSkeleton>
    </PermissionGuard>
  );
}
