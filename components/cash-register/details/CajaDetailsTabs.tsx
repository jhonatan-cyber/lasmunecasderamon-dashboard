'use client';
import { Button } from '@/components/ui/button';

import { memo } from 'react';
import type { CajaDetailsTab } from '@/components/cash-register/hooks/useCajaDetailsView';

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
    <div className='mx-3 mt-4 flex flex-wrap justify-center gap-1.5 border-b pb-2 sm:mx-6 sm:gap-2 sm:pb-1 print:hidden'>
      {TABS.map(({ value, label, countKey }) => (
        <Button
          variant='unstyled'
          key={value}
          onClick={() => onTabChange(value)}
          className={`px-3 py-1.5 text-xs font-semibold transition-all rounded-full sm:px-4 sm:py-2 sm:text-sm ${
            activeTab === value
              ? 'bg-gray-900 text-white shadow-xs dark:bg-white dark:text-black'
              : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800'
          }`}
        >
          {label}
          {countKey ? ` (${counts[countKey]})` : ''}
        </Button>
      ))}
    </div>
  );
});
