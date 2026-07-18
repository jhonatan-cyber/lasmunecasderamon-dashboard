'use client';

import { useMemo, useState } from 'react';
import PayrollTable from '@/components/payroll/PayrollTable';
import PayrollFilters from '@/components/payroll/PayrollFilters';
import PayrollRoleButtons from '@/components/payroll/PayrollRoleButtons';
import { usePayroll } from '@/hooks/personal';
import { PermissionGuard } from '@/components/auth/PermissionGuard';
import { useUserPermissions } from '@/hooks/auth/useUserPermissions';
import { Skeleton as BoneyardSkeleton } from 'boneyard-js/react';

export function PayrollPageClient() {
  const {
    paginated,
    loading,
    error,
    roleFilter,
    setRoleFilter,
    searchTerm,
    setSearchTerm,
    rowsPerPage,
    setRowsPerPage,
    page,
    setPage,
    totalPages,
    clearFilters,
    fetchPayroll
  } = usePayroll();

  const [sortBy, setSortBy] = useState('usuario');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const { userPermissions } = useUserPermissions();

  const sortedRows = useMemo(() => {
    return [...paginated].sort((a: any, b: any) => {
      let aVal = a[sortBy];
      let bVal = b[sortBy];
      if (typeof aVal === 'string') aVal = aVal.toLowerCase();
      if (typeof bVal === 'string') bVal = bVal.toLowerCase();
      if (aVal < bVal) return sortOrder === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });
  }, [paginated, sortBy, sortOrder]);

  return (
    <PermissionGuard module='payroll' action='view'>
      <BoneyardSkeleton name="payroll-main" loading={loading}>
        <div className='p-4 sm:p-6 lg:p-10 space-y-4 sm:space-y-6 mt-4 sm:mt-6 lg:mt-10'>
          <div className='flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 sm:gap-6 mb-4 sm:mb-6'>
            <div className='flex flex-col'>
              <h1 className='text-xl sm:text-2xl lg:text-3xl font-bold'>Pagos a Trabajadores</h1>
              <p className='text-sm sm:text-base text-gray-600'>
                Gestiona los sueldos pendientes de los trabajadores
              </p>
            </div>
          </div>
          <PayrollFilters
            searchTerm={searchTerm}
            setSearchTerm={setSearchTerm}
            sortBy={sortBy}
            setSortBy={setSortBy}
            sortOrder={sortOrder}
            setSortOrder={setSortOrder}
            rowsPerPage={rowsPerPage}
            setRowsPerPage={setRowsPerPage}
            setPage={setPage}
            onClear={() => {
              setSortBy('usuario');
              setSortOrder('asc');
              clearFilters();
            }}
          />
          <PayrollRoleButtons roleFilter={roleFilter} setRoleFilter={setRoleFilter} />
          <PayrollTable
            key={`payroll-${userPermissions.length}`}
            rows={sortedRows}
            loading={loading}
            error={error}
            page={page}
            totalPages={totalPages}
            setPage={setPage}
            onRefetch={() => {
              fetchPayroll();
            }}
          />
        </div>
      </BoneyardSkeleton>
    </PermissionGuard>
  );
}

