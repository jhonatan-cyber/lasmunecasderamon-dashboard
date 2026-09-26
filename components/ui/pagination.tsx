import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { ChevronLeft, ChevronRight, MoreHorizontal } from 'lucide-react';

import { cn } from '@/lib/utils/utils';
import { buttonVariants } from '@/components/ui/button';

function Pagination({ className, ...props }: React.ComponentProps<'nav'>) {
  return (
    <nav
      role='navigation'
      aria-label='pagination'
      className={cn('mx-auto flex w-full justify-center', className)}
      {...props}
    />
  );
}
Pagination.displayName = 'Pagination';

function PaginationContent({ className, ...props }: React.ComponentProps<'ul'>) {
  return <ul className={cn('flex flex-row items-center gap-1', className)} {...props} />;
}
PaginationContent.displayName = 'PaginationContent';

function PaginationItem({ className, ...props }: React.ComponentProps<'li'>) {
  return <li className={cn('', className)} {...props} />;
}
PaginationItem.displayName = 'PaginationItem';

type PaginationLinkProps = {
  isActive?: boolean;
  asChild?: boolean;
} & React.ComponentProps<'a'>;

function PaginationLink({ className, isActive, asChild, ...props }: PaginationLinkProps) {
  const Comp = asChild ? Slot : 'a';
  return (
    <Comp
      aria-current={isActive ? 'page' : undefined}
      className={cn(
        buttonVariants({ variant: isActive ? 'outline' : 'ghost', size: 'sm' }),
        isActive &&
          'pointer-events-none border border-primary bg-accent font-semibold text-accent-foreground hover:bg-accent hover:text-accent-foreground',
        className
      )}
      {...props}
    />
  );
}
PaginationLink.displayName = 'PaginationLink';

function PaginationPrevious({ className, ...props }: React.ComponentProps<typeof PaginationLink>) {
  return (
    <PaginationLink
      aria-label='Go to previous page'
      className={cn('gap-1 pl-2.5', className)}
      {...props}
    >
      <ChevronLeft aria-hidden='true' />
      Anterior
    </PaginationLink>
  );
}
PaginationPrevious.displayName = PaginationLink.displayName;

function PaginationNext({ className, ...props }: React.ComponentProps<typeof PaginationLink>) {
  return (
    <PaginationLink
      aria-label='Go to next page'
      className={cn('gap-1 pr-2.5', className)}
      {...props}
    >
      Siguiente
      <ChevronRight aria-hidden='true' />
    </PaginationLink>
  );
}
PaginationNext.displayName = PaginationLink.displayName;

function PaginationEllipsis({ className, ...props }: React.ComponentProps<'span'>) {
  return (
    <span
      aria-hidden='true'
      className={cn('flex h-9 w-9 items-center justify-center', className)}
      {...props}
    >
      <MoreHorizontal className='h-4 w-4' />
      <span className='sr-only'>More pages</span>
    </span>
  );
}
PaginationEllipsis.displayName = 'PaginationEllipsis';

export {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious
};
