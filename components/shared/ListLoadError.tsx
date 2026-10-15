'use client';
import { Button } from '@/components/ui/button';
export function ListLoadError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div
      role='alert'
      className='rounded-3xl border border-red-200 bg-red-50 p-6 text-red-800 dark:border-red-900 dark:bg-red-950/30 dark:text-red-200'
    >
      <p>{message}</p>
      <Button variant='outline' className='mt-3 rounded-full' onClick={onRetry}>
        Reintentar
      </Button>
    </div>
  );
}
