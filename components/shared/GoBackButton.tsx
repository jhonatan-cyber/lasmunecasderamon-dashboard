'use client';

import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

export function GoBackButton() {
  return (
    <Button variant='outline' onClick={() => window.history.back()} className='gap-2'>
      <ArrowLeft className='w-4 h-4' />
      Volver atrás
    </Button>
  );
}
