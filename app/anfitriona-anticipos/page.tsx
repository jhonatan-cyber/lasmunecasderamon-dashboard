'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useCurrentUser } from '@/hooks/auth/useCurrentUser';
import { ArrowLeft, Search } from 'lucide-react';
import { SortableTh } from '@/components/shared/SortableTh';
import { useRouter } from 'next/navigation';
import { Input } from '@/components/ui/input';
import SelectElements from '@/components/shared/SelectElements';
import Paginate from '@/components/shared/Paginate';
import { formatDateLabel, formatDateTimeDmyLabel } from '@/lib/utils/calendarUtils';
import { formatCurrencyCLP } from '@/lib/utils/formatters';
import { Skeleton as BoneyardSkeleton } from 'boneyard-js/react';
import logger from '@/lib/utils/logger';

interface Advance {
  id_anticipo: number;
  fecha_crea: string;
  fecha_mod: string;
  monto: number;
  estado: number;
}

export default function AnfitrionaAnticiposPage() {
  const { user, loading: userLoading } = useCurrentUser();
  const router = useRouter();
  const [advances, setAdvances] = useState<Advance[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [rowsPerPage, setRowsPerPage] = useState(5);
  const [page, setPage] = useState(1);
  const [sortField, setSortField] = useState<keyof Advance>('fecha_crea');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  const fetchAdvances = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/anticipos/user');
      const data = await res.json();

      if (res.ok && data.success) {
        setAdvances(data.data || []);
      } else {
        logger.error('API error:', data.message);
        setAdvances([]);
      }
    } catch (error) {
      logger.captureException(error, { context: 'AnfitrionaAnticipos:fetchAdvances' });
      setAdvances([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdvances();
  }, []);

  if (userLoading) {
    return (
      <div className='p-6 flex items-center justify-center min-h-screen'>
        <div className='text-center'>
          <div className='animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto'></div>
          <p className='mt-4 text-gray-600'>Cargando...</p>
        </div>
      </div>
    );
  }

  if (user?.role?.toLowerCase() !== 'anfitriona') {
    return (
      <div className='p-6 flex items-center justify-center min-h-screen'>
        <div className='text-center'>
          <h1 className='text-2xl font-bold text-red-600 mb-4'>Acceso Denegado</h1>
          <p className='text-gray-600'>No tienes permisos para acceder a esta página.</p>
        </div>
      </div>
    );
  }

  const totalAdvances = advances.length;
  const totalAmount = advances.reduce((sum, advance) => sum + (advance.monto || 0), 0);
  const totalToPay = advances
    .filter(advance => advance.estado === 1)
    .reduce((sum, advance) => sum + (advance.monto || 0), 0);

  const filteredAdvances = advances.filter(advance => {
    if (!searchTerm) return true;

    try {
      const date = formatDateLabel(advance.fecha_crea);
      return (
        date.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (advance.monto || 0).toString().includes(searchTerm) ||
        (advance.id_anticipo || '').toString().includes(searchTerm)
      );
    } catch (error) {
      return false;
    }
  });

  const sortedAdvances = [...filteredAdvances].sort((a, b) => {
    const aValue = a[sortField];
    const bValue = b[sortField];

    if (typeof aValue === 'string' && typeof bValue === 'string') {
      return sortDirection === 'asc' ? aValue.localeCompare(bValue) : bValue.localeCompare(aValue);
    }

    if (typeof aValue === 'number' && typeof bValue === 'number') {
      return sortDirection === 'asc' ? aValue - bValue : bValue - aValue;
    }

    return 0;
  });

  const paginatedAdvances = sortedAdvances.slice((page - 1) * rowsPerPage, page * rowsPerPage);
  const totalPages = Math.ceil(sortedAdvances.length / rowsPerPage) || 1;

  const handleSort = (field: keyof Advance) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const getStatusBadge = (estado: number) => {
    if (estado === 1) {
      return (
        <span className='inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800'>
          Por pagar
        </span>
      );
    } else {
      return (
        <span className='inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-50 text-purple-700'>
          Pagado
        </span>
      );
    }
  };

  const renderFechaPago = (estado: number, fecha_mod: string) => {
    if (estado === 1) {
      return (
        <span className='inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800'>
          Por pagar
        </span>
      );
    }
    if (fecha_mod) {
      const { date, time } = formatDateTimeDmyLabel(fecha_mod);
      return (
        <div>
          <div className='text-sm font-medium text-gray-900'>{date}</div>
          <div className='text-sm text-gray-500'>{time}</div>
        </div>
      );
    }
    return '—';
  };

  return (
    <div className='p-6 space-y-6'>
      <BoneyardSkeleton name="anfitriona-anticipos-main" loading={loading}>
      {}
      <div className='flex justify-between items-center'>
        <div>
          <p className='text-sm text-gray-500'>LAS MUÑECAS DE RAMÓN</p>
          <h1 className='text-2xl font-bold text-gray-900'>
            Listado de Anticipos {user?.name} {user?.lastName}
          </h1>
        </div>
        <Button
          variant='outline'
          onClick={() => router.back()}
          className='flex items-center gap-2 rounded-full bg-black text-white hover:scale-105 transition-all duration-200'
        >
          <ArrowLeft className='h-4 w-4' />
          Atrás
        </Button>
      </div>

      {}
      <div className='text-center'>
        <p className='text-sm text-gray-500'>Total a pagar:</p>
        <p className='text-2xl font-bold text-gray-900'>{formatCurrencyCLP(totalToPay)}</p>
      </div>

      {}
      <div className='flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4'>
        <SelectElements
          value={rowsPerPage}
          onChange={value => {
            setRowsPerPage(value);
            setPage(1);
          }}
          options={[5, 10, 25, 50]}
          label='Listar'
        />

        <div className='flex items-center gap-2'>
          <span className='text-sm text-gray-600'>Buscar:</span>
          <Input
            type='text'
            placeholder='Buscar anticipos...'
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className='w-48'
          />
        </div>
      </div>

      {}
      <Card>
        <CardContent className='p-0'>
          <div className='overflow-x-auto'>
            <table className='w-full'>
              <thead className='bg-gray-50'>
                <tr>
                  <SortableTh
                    field='id_anticipo'
                    sortField={sortField}
                    sortDirection={sortDirection}
                    onSort={handleSort}
                  >
                    #
                  </SortableTh>
                  <SortableTh
                    field='fecha_crea'
                    sortField={sortField}
                    sortDirection={sortDirection}
                    onSort={handleSort}
                  >
                    FECHA DE SOLICITUD
                  </SortableTh>
                  <SortableTh
                    field='monto'
                    sortField={sortField}
                    sortDirection={sortDirection}
                    onSort={handleSort}
                  >
                    MONTO
                  </SortableTh>
                  <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
                    FECHA DE PAGO
                  </th>
                  <SortableTh
                    field='estado'
                    sortField={sortField}
                    sortDirection={sortDirection}
                    onSort={handleSort}
                  >
                    ESTADO
                  </SortableTh>
                </tr>
              </thead>
              <tbody className='bg-white divide-y divide-gray-200'>
                {paginatedAdvances.length === 0 ? (
                  <tr>
                    <td colSpan={5} className='px-6 py-4 text-center text-gray-500'>
                      No se encontraron anticipos
                    </td>
                  </tr>
                ) : (
                  paginatedAdvances.map((advance, index) => {
                    return (
                      <tr key={advance.id_anticipo} className='hover:bg-gray-50'>
                        <td className='px-6 py-4 whitespace-nowrap'>
                          <div className='w-8 h-8 bg-purple-300 text-white rounded-full flex items-center justify-center text-sm font-medium'>
                            {(page - 1) * rowsPerPage + index + 1}
                          </div>
                        </td>
                        <td className='px-6 py-4 whitespace-nowrap'>
                          <div>
                            <div className='text-sm font-medium text-gray-900'>
                              {formatDateTimeDmyLabel(advance.fecha_crea).date}
                            </div>
                            <div className='text-sm text-gray-500'>
                              {formatDateTimeDmyLabel(advance.fecha_crea).time}
                            </div>
                          </div>
                        </td>
                        <td className='px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900'>
                          {formatCurrencyCLP(advance.monto)}
                        </td>
                        <td className='px-6 py-4 whitespace-nowrap'>
                          {renderFechaPago(advance.estado, advance.fecha_mod)}
                        </td>
                        <td className='px-6 py-4 whitespace-nowrap'>
                          {getStatusBadge(advance.estado)}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {}
      <div className='flex justify-center'>
        <Paginate page={page} totalPages={totalPages} setPage={setPage} />
      </div>
      </BoneyardSkeleton>
    </div>
  );
}
