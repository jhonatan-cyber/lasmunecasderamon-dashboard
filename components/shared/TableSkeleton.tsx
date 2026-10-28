import { Skeleton } from '@/components/ui/skeleton';

/** Esqueleto de carga compartido por las tablas del panel. */
export function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className='space-y-3'>
      <Skeleton className='h-8 w-full' />
      {Array.from({ length: rows }).map((_, index) => (
        <Skeleton key={index} className='h-12 w-full' />
      ))}
    </div>
  );
}
