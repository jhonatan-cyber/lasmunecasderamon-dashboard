'use client';
import { FilterBar } from '@/components/shared/FilterBar';
import SelectElements from '@/components/shared/SelectElements';
import { SELECT_LABEL_CLASS } from '@/components/shared/selectStyles';
import { SortSelect } from '@/components/shared/selects/SortSelect';

import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Trash2 } from 'lucide-react';
import SearchInput from '@/components/shared/SearchInput';
import { FilterSelect } from '@/components/shared/selects';

interface OvertimeFiltersProps {
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  statusFilter: string;
  setStatusFilter: (status: string) => void;
  sortBy: string;
  setSortBy: (sort: string) => void;
  sortOrder: 'asc' | 'desc';
  setSortOrder: (order: 'asc' | 'desc') => void;
  pageSize: number;
  setPageSize: (size: number) => void;
  onClearFilters: () => void;
  loading: boolean;
  isAdmin?: boolean;
}

export default function OvertimeFilters({
  searchTerm,
  setSearchTerm,
  statusFilter,
  setStatusFilter,
  sortBy,
  setSortBy,
  sortOrder,
  setSortOrder,
  pageSize,
  setPageSize,
  onClearFilters,
  loading,
  isAdmin = false
}: OvertimeFiltersProps) {
  return (
    <Card className='shadow-md border-none bg-white dark:bg-slate-900/40 rounded-3xl mb-6'>
      <CardContent className='p-6'>
        <FilterBar>
          <div>
            <Label className={SELECT_LABEL_CLASS}>{isAdmin ? 'Buscar usuario' : 'Buscar'}</Label>
            <SearchInput
              value={searchTerm}
              onChange={setSearchTerm}
              placeholder={isAdmin ? 'Nombre...' : 'Monto u horas...'}
            />
          </div>
          <FilterSelect
            value={statusFilter}
            onChange={setStatusFilter}
            label='Estado'
            options={[
              { value: 'all', label: 'Todos' },
              { value: 'por_cobrar', label: isAdmin ? 'Por pagar' : 'Por cobrar' },
              { value: 'cobrado', label: isAdmin ? 'Pagado' : 'Cobrado' }
            ]}
          />
          <SortSelect
            field={sortBy}
            direction={sortOrder}
            options={[
              { value: 'fecha_crea', label: 'Creación' },
              { value: 'fecha_mod', label: 'Pago' },
              { value: 'total', label: 'Monto' },
              { value: 'hora', label: 'Horas' }
            ]}
            onChange={(field, direction) => {
              setSortBy(field);
              setSortOrder(direction);
            }}
          />
          <SelectElements value={pageSize} onChange={setPageSize} options={[5, 10, 20, 50]} />
          <Button
            onClick={onClearFilters}
            disabled={loading}
            variant='outline'
            size='icon'
            aria-label='Limpiar filtros'
            className='h-11 w-11 flex-none! rounded-full'
          >
            <Trash2 className='h-4 w-4' />
          </Button>
        </FilterBar>
      </CardContent>
    </Card>
  );
}
