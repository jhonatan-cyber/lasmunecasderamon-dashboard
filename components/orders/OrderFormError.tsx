'use client';

import { ErrorState } from '@/components/shared/ErrorState';

interface OrderFormErrorProps {
  message: string | null;
}

export default function OrderFormError({ message }: OrderFormErrorProps) {
  if (!message) return null;

  return <ErrorState size='sm' message={message} />;
}
