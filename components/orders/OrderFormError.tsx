'use client';

interface OrderFormErrorProps {
  message: string | null;
}

export default function OrderFormError({ message }: OrderFormErrorProps) {
  if (!message) return null;

  return (
    <div className='rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/70 dark:bg-red-950/40 dark:text-red-300'>
      {message}
    </div>
  );
}
