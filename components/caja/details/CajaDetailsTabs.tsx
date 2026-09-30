'use client';

import { memo } from 'react';
import type { CajaDetailsTab } from '@/components/caja/hooks/useCajaDetailsView';

interface CajaDetailsTabsProps {
  activeTab: CajaDetailsTab;
  onTabChange: (tab: CajaDetailsTab) => void;
  counts: { ventas: number; servicios: number; retiros: number };
}

const TABS: Array<{
  value: CajaDetailsTab;
  label: string;
  countKey?: keyof CajaDetailsTabsProps['counts'];
}> = [
  { value: 'resumen', label: 'Resumen' },
  { value: 'ventas', label: 'Ventas', countKey: 'ventas' },
  { value: 'servicios', label: 'Servicios', countKey: 'servicios' },
  { value: 'retiros', label: 'Retiros', countKey: 'retiros' }
];

/** Pestañas del modal; cada una muestra el total de su lista. */
export const CajaDetailsTabs = memo(function CajaDetailsTabs({
  activeTab,
  onTabChange,
  counts
}: CajaDetailsTabsProps) {
  return (
    <div className='flex justify-center gap-2 mx-6 mt-4 border-b pb-1 print:hidden'>
      {TABS.map(({ value, label, countKey }) => (
        <button
          key={value}
          onClick={() => onTabChange(value)}
          className={`px-4 py-2 text-sm font-semibold transition-all rounded-full ${
            activeTab === value
              ? 'bg-gray-900 text-white shadow-xs dark:bg-white dark:text-black'
              : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800'
          }`}
        >
          {label}
          {countKey ? ` (${counts[countKey]})` : ''}
        </button>
      ))}
    </div>
  );
});
