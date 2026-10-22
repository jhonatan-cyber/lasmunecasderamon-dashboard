'use client';

import { Wine, Users } from 'lucide-react';
import { formatCurrencyCLP } from '@/lib/utils/formatters';

interface AnfitrionaInfoProps {
  hasChampagneProducts: boolean;
  maxChampagnePrice: number;
  maxAnfitrionas: number;
}

export default function AnfitrionaInfo({
  hasChampagneProducts,
  maxChampagnePrice,
  maxAnfitrionas
}: AnfitrionaInfoProps) {
  return (
    <div className='w-full flex justify-center mt-2 mb-2'>
      <div
        className={`text-xs p-2 rounded-md max-w-xl w-full text-center ${
          hasChampagneProducts
            ? 'bg-blue-50 text-blue-700 border border-blue-200'
            : 'bg-orange-50 text-orange-700 border border-orange-200'
        }`}
      >
        {hasChampagneProducts ? (
          <Wine className='mr-1 inline' />
        ) : (
          <Users className='mr-1 inline' />
        )}
        {hasChampagneProducts
          ? `Champaña de ${formatCurrencyCLP(maxChampagnePrice)}: Puedes seleccionar hasta ${maxAnfitrionas} anfitriona${maxAnfitrionas !== 1 ? 's' : ''}`
          : 'Productos sin champaña: Solo puedes seleccionar 1 anfitriona máximo'}
      </div>
    </div>
  );
}
