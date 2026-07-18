'use client';

import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/table';
import { Card, CardContent } from '@/components/ui/card';
import { Wallet } from 'lucide-react';
import { Anticipo } from '@/hooks/personal';
import { useAdvancesTable } from '@/hooks/personal/useAdvancesTable';
import { AdvancesMobileCard } from './AdvancesMobileCard';
import { AdvancesTableRow } from './AdvancesTableRow';

interface AdvancesTableProps {
  loading: boolean;
  advances: Anticipo[];
  pageSize?: number;
  isAdmin?: boolean;
  onAction?: (id: string | number, action: 'approve' | 'reject') => Promise<any>;
  activeTab?: 'pending' | 'paid';
}

function MobileSkeletons({ count = 5 }: { count?: number }) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <Card
          key={i}
          className='rounded-3xl border-none shadow-md bg-white dark:bg-slate-900/40 overflow-hidden animate-pulse'
        >
          <CardContent className='p-4'>
            <Skeleton className='h-6 w-1/2 mb-4' />
            <Skeleton className='h-4 w-full mb-2' />
            <Skeleton className='h-4 w-3/4 mb-2' />
            <Skeleton className='h-4 w-1/2' />
          </CardContent>
        </Card>
      ))}
    </>
  );
}

function DesktopSkeletons({ pageSize, isAdmin }: { pageSize: number; isAdmin: boolean }) {
  return (
    <div className='bg-white dark:bg-slate-900/40 backdrop-blur-xs rounded-3xl border-none shadow-md overflow-hidden'>
      <Table>
        <TableHeader className='bg-gray-100 dark:bg-slate-900/50'>
          <TableRow className='hover:bg-transparent border-gray-100 dark:border-gray-800'>
            <TableHead className='py-4 px-5 text-xs uppercase text-gray-500'>Empleado</TableHead>
            <TableHead className='py-4 px-5 text-xs uppercase text-gray-500 text-center'>Fecha Solic.</TableHead>
            <TableHead className='py-4 px-5 text-xs uppercase text-gray-500 text-center'>Fecha Aprob.</TableHead>
            <TableHead className='py-4 px-5 text-xs uppercase text-gray-500 text-center'>Estado</TableHead>
            <TableHead className='py-4 px-5 text-xs uppercase text-gray-500 text-right'>Monto</TableHead>
            <TableHead className='py-4 px-5 text-xs uppercase text-gray-500 text-center'>Entregado por</TableHead>
            {isAdmin && (
              <TableHead className='py-4 px-5 text-xs uppercase text-gray-500 text-center'>Acciones</TableHead>
            )}
          </TableRow>
        </TableHeader>
        <TableBody>
          {Array.from({ length: pageSize }).map((_, i) => (
            <TableRow key={`loading-${i}`}>
              <TableCell><Skeleton className='h-10 w-40 rounded-full' /></TableCell>
              <TableCell><Skeleton className='h-4 w-24 mx-auto' /></TableCell>
              <TableCell><Skeleton className='h-6 w-20 mx-auto rounded-full' /></TableCell>
              <TableCell><Skeleton className='h-4 w-24 ml-auto' /></TableCell>
              <TableCell><Skeleton className='h-4 w-24 mx-auto' /></TableCell>
              {isAdmin && <TableCell><Skeleton className='h-8 w-20 mx-auto rounded-full' /></TableCell>}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function AdvancesSection({
  title,
  advancesToRender,
  loading,
  pageSize,
  isAdmin,
  onAction,
  getStatusBadge,
}: {
  title: string;
  advancesToRender: Anticipo[];
  loading: boolean;
  pageSize: number;
  isAdmin: boolean;
  onAction?: (id: string | number, action: 'approve' | 'reject') => Promise<any>;
  getStatusBadge: (estado: number, a: Anticipo) => React.ReactNode;
}) {
  return (
    <div className='space-y-4'>
      <h3 className='text-sm font-semibold text-gray-900 dark:text-white px-2'>
        {title} ({advancesToRender.length})
      </h3>

      {/* Mobile cards */}
      <div className='lg:hidden space-y-4'>
        {loading && advancesToRender.length === 0 ? (
          <MobileSkeletons />
        ) : advancesToRender.length === 0 ? (
          <Card className='rounded-3xl border-none shadow-xs bg-white dark:bg-slate-900/40 overflow-hidden'>
            <CardContent className='p-8 text-center text-gray-500'>
              <p className='text-sm'>No hay anticipos en esta categoría</p>
            </CardContent>
          </Card>
        ) : (
          advancesToRender.map(a => (
            <AdvancesMobileCard
              key={a.id_anticipo}
              anticipo={a}
              isAdmin={isAdmin}
              onAction={onAction}
              statusBadge={getStatusBadge(a.estado, a)}
            />
          ))
        )}
      </div>

      {/* Desktop table */}
      <div className='hidden lg:block'>
        {loading && advancesToRender.length === 0 ? (
          <DesktopSkeletons pageSize={pageSize} isAdmin={isAdmin} />
        ) : advancesToRender.length === 0 ? (
          <div className='bg-white dark:bg-slate-900/40 backdrop-blur-xs rounded-3xl border-none shadow-md overflow-hidden'>
            <div className='p-8 text-center text-gray-500'>
              <p className='text-sm'>No hay anticipos en esta categoría</p>
            </div>
          </div>
        ) : (
          <div className='bg-white dark:bg-slate-900/40 backdrop-blur-xs rounded-3xl border-none shadow-md overflow-hidden'>
            <Table>
              <TableHeader className='bg-gray-100 dark:bg-slate-900/50'>
                <TableRow className='hover:bg-transparent border-gray-100 dark:border-gray-800'>
                  <TableHead className='py-4 px-5 text-xs uppercase text-gray-500'>Empleado</TableHead>
                  <TableHead className='py-4 px-5 text-xs uppercase text-gray-500 text-center'>Fecha Solic.</TableHead>
                  <TableHead className='py-4 px-5 text-xs uppercase text-gray-500 text-center'>Fecha Aprob.</TableHead>
                  <TableHead className='py-4 px-5 text-xs uppercase text-gray-500 text-center'>Estado</TableHead>
                  <TableHead className='py-4 px-5 text-xs uppercase text-gray-500 text-right'>Monto</TableHead>
                  <TableHead className='py-4 px-5 text-xs uppercase text-gray-500 text-center'>Entregado por</TableHead>
                  {isAdmin && (
                    <TableHead className='py-4 px-5 text-xs uppercase text-gray-500 text-center'>Acciones</TableHead>
                  )}
                </TableRow>
              </TableHeader>
              <TableBody>
                {advancesToRender.map((a, idx) => (
                  <AdvancesTableRow
                    key={a.id_anticipo}
                    anticipo={a}
                    idx={idx}
                    total={advancesToRender.length}
                    isAdmin={isAdmin}
                    onAction={onAction}
                    statusBadge={getStatusBadge(a.estado, a)}
                  />
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </div>
  );
}

export default function AdvancesTable({
  loading,
  advances,
  pageSize = 10,
  isAdmin = false,
  onAction,
  activeTab = 'pending',
}: AdvancesTableProps) {
  const { filteredAdvances, paidAdvances, pendingAdvances, getStatusBadge } = useAdvancesTable(
    advances,
    activeTab
  );

  if (filteredAdvances.length === 0 && !loading) {
    return (
      <Card className='border-none shadow-md rounded-3xl bg-white dark:bg-slate-900/40 overflow-hidden'>
        <CardContent className='flex flex-col items-center justify-center py-16 text-gray-500'>
          <Wallet className='h-12 w-12 mb-4 opacity-20' />
          <p className='text-lg font-medium'>
            No hay anticipos {activeTab === 'pending' ? 'por cobrar' : 'cobrados'}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className='space-y-6'>
      {(pendingAdvances.length > 0 || loading) && (
        <AdvancesSection
          title={activeTab === 'pending' ? 'Por Cobrar' : 'Cobrados'}
          advancesToRender={pendingAdvances}
          loading={loading}
          pageSize={pageSize}
          isAdmin={isAdmin}
          onAction={onAction}
          getStatusBadge={getStatusBadge}
        />
      )}

      {(paidAdvances.length > 0 || loading) && (
        <AdvancesSection
          title={activeTab === 'pending' ? 'Entregados' : 'Cobrados en Planilla'}
          advancesToRender={paidAdvances}
          loading={loading}
          pageSize={pageSize}
          isAdmin={isAdmin}
          onAction={onAction}
          getStatusBadge={getStatusBadge}
        />
      )}
    </div>
  );
}
