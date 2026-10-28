'use client';

import { ErrorState } from '@/components/shared/ErrorState';

export function ListLoadError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return <ErrorState size='lg' message={message} onRetry={onRetry} />;
}
