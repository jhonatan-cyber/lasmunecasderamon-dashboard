import { Button } from '@/components/ui/button';
import { ChevronUp, ChevronDown } from 'lucide-react';
import { ModuleTableHead } from '@/components/shared/tables/ModuleTable';

interface SortableThProps<T> {
  field: T;
  sortField: T;
  sortDirection: 'asc' | 'desc';
  onSort: (field: T) => void;
  children: React.ReactNode;
  variant?: 'module';
}

export function SortableTh<T extends string>({
  field,
  sortField,
  sortDirection,
  onSort,
  children,
  variant
}: SortableThProps<T>) {
  const isActive = field === sortField;
  const Head = ModuleTableHead;

  return (
    <Head
      className={
        variant === 'module'
          ? undefined
          : 'px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'
      }
      aria-sort={isActive ? (sortDirection === 'asc' ? 'ascending' : 'descending') : 'none'}
    >
      <Button
        variant='unstyled'
        type='button'
        onClick={() => onSort(field)}
        className={`flex items-center gap-1 hover:text-foreground ${variant === 'module' ? 'w-full justify-center' : ''}`}
      >
        {children}
        {isActive ? (
          sortDirection === 'asc' ? (
            <ChevronUp className='h-4 w-4' />
          ) : (
            <ChevronDown className='h-4 w-4' />
          )
        ) : (
          <ChevronUp className='h-4 w-4 opacity-0' />
        )}
      </Button>
    </Head>
  );
}
