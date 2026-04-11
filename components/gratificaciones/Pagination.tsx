import React from 'react';
import { Button } from '../ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';
import { cn } from '@/lib/utils/utils';

export interface PaginationProps {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage: number;
  visiblePages: number[];
  onPageChange: (page: number) => void;
  onItemsPerPageChange: (itemsPerPage: number) => void;
  itemsPerPageOptions?: number[];
  showItemsPerPage?: boolean;
  showTotalItems?: boolean;
  className?: string;
}

export function Pagination({
  currentPage,
  totalPages,
  totalItems,
  itemsPerPage,
  visiblePages,
  onPageChange,
  onItemsPerPageChange,
  itemsPerPageOptions = [10, 20, 50, 100],
  showItemsPerPage = true,
  showTotalItems = true,
  className
}: PaginationProps) {
  if (totalPages <= 1) {
    return null;
  }

  return (
    <div className={cn('flex items-center justify-between space-x-2 py-4', className)}>
      <div className='flex items-center space-x-2'>
        {showItemsPerPage && (
          <>
            <span className='text-sm text-muted-foreground'>Mostrar:</span>
            <Select
              value={itemsPerPage.toString()}
              onValueChange={(value: string) => onItemsPerPageChange(parseInt(value))}
            >
              <SelectTrigger className='w-[70px]'>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {itemsPerPageOptions.map(option => (
                  <SelectItem key={option} value={option.toString()}>
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </>
        )}

        {showTotalItems && (
          <span className='text-sm text-muted-foreground'>
            {totalItems} {totalItems === 1 ? 'elemento' : 'elementos'}
          </span>
        )}
      </div>

      <div className='flex items-center space-x-2'>
        <Button
          variant='outline'
          size='sm'
          onClick={() => onPageChange(1)}
          disabled={currentPage === 1}
          aria-label='Ir a la primera página'
        >
          <ChevronsLeft className='h-4 w-4' />
        </Button>

        <Button
          variant='outline'
          size='sm'
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          aria-label='Página anterior'
        >
          <ChevronLeft className='h-4 w-4' />
        </Button>

        <div className='flex items-center space-x-1'>
          {visiblePages.map(page => (
            <Button
              key={page}
              variant={currentPage === page ? 'default' : 'outline'}
              size='sm'
              onClick={() => onPageChange(page)}
              className='w-8 h-8 p-0'
              aria-label={`Ir a la página ${page}`}
              aria-current={currentPage === page ? 'page' : undefined}
            >
              {page}
            </Button>
          ))}
        </div>

        <Button
          variant='outline'
          size='sm'
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          aria-label='Página siguiente'
        >
          <ChevronRight className='h-4 w-4' />
        </Button>

        <Button
          variant='outline'
          size='sm'
          onClick={() => onPageChange(totalPages)}
          disabled={currentPage === totalPages}
          aria-label='Ir a la última página'
        >
          <ChevronsRight className='h-4 w-4' />
        </Button>
      </div>

      <div className='text-sm text-muted-foreground'>
        Página {currentPage} de {totalPages}
      </div>
    </div>
  );
}

export default Pagination;
