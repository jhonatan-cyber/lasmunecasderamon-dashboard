import { ChevronUp, ChevronDown } from 'lucide-react';

interface SortableThProps<T> {
  field: T;
  sortField: T;
  sortDirection: 'asc' | 'desc';
  onSort: (field: T) => void;
  children: React.ReactNode;
}

export function SortableTh<T extends string>({
  field,
  sortField,
  sortDirection,
  onSort,
  children
}: SortableThProps<T>) {
  const isActive = field === sortField;

  return (
    <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
      <button
        onClick={() => onSort(field)}
        className='flex items-center gap-1 hover:text-gray-700'
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
      </button>
    </th>
  );
}
