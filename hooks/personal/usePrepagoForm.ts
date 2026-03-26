import { useState } from 'react';
import { Client } from '@/types/client';

interface UsePrepagoFormProps {
  client: Client | null;
  onSubmit: (e: React.FormEvent) => void;
}

export function usePrepagoForm({ client, onSubmit }: UsePrepagoFormProps) {
  const [amount, setAmount] = useState('');

  const reset = () => setAmount('');

  return { amount, setAmount, reset, handleSubmit: onSubmit };
}
