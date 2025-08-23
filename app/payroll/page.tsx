'use client';

import PayrollTable from '@/components/payroll/PayrollTable';
import PayrollFilters from '@/components/payroll/PayrollFilters';
import PayrollRoleButtons from '@/components/payroll/PayrollRoleButtons';
import usePayroll from '@/hooks/usePayroll';

export default function PayrollPage() {
  const {
    // data
    paginated,
    loading,
    error,
    // filters
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

  return (
    <div className='p-4 sm:p-6 lg:p-10 space-y-4 sm:space-y-6 mt-4 sm:mt-6 lg:mt-10'>
      <div className='flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 sm:gap-6 mb-4 sm:mb-6'>
        <div className='flex flex-col'>
          <h1 className='text-xl sm:text-2xl lg:text-3xl font-bold'>Pagos a Trabajadores</h1>
          <p className='text-sm sm:text-base text-gray-600'>Gestiona los sueldos pendientes de los trabajadores</p>
        </div>
      </div>
      <PayrollFilters
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        rowsPerPage={rowsPerPage}
        setRowsPerPage={setRowsPerPage}
        setPage={setPage}
        onClear={clearFilters}
      />
      <PayrollRoleButtons roleFilter={roleFilter} setRoleFilter={setRoleFilter} />
      <PayrollTable
        rows={paginated}
        loading={loading}
        error={error}
        page={page}
        totalPages={totalPages}
        setPage={setPage}
        onRefetch={fetchPayroll}
      />
    </div>
  );
}
