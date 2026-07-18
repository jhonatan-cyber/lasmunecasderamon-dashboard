'use client';

import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';

interface CashRegisterHeaderProps {
  period: string;
  startDate: string;
  endDate: string;
  onPeriodChange: (period: string) => void;
  onStartDateChange: (date: string) => void;
  onEndDateChange: (date: string) => void;
  onExport: () => void;
}

const PERIOD_CHIPS = [
  { id: 'today', label: 'Hoy' },
  { id: 'yesterday', label: 'Ayer' },
  { id: 'week', label: 'Esta Semana' },
  { id: 'month', label: 'Este Mes' },
  { id: 'custom', label: 'Personalizado' },
] as const;

export function CashRegisterHeader({
  period,
  startDate,
  endDate,
  onPeriodChange,
  onStartDateChange,
  onEndDateChange,
  onExport,
}: CashRegisterHeaderProps) {
  return (
    <div className="flex flex-col md:flex-row items-center justify-between gap-6">
      <div className="flex flex-wrap items-center gap-2 bg-gray-100/50 dark:bg-gray-800/50 p-1.5 rounded-2xl border border-gray-200/50 dark:border-gray-700/50 backdrop-blur-xs">
        {PERIOD_CHIPS.map((chip) => (
          <button
            key={chip.id}
            onClick={() => onPeriodChange(chip.id)}
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-300 ${
              period === chip.id
                ? 'bg-white dark:bg-gray-700 text-yellow-600 dark:text-yellow-400 shadow-xs scale-105'
                : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-200/50 dark:hover:bg-gray-700/50'
            }`}
          >
            {chip.label}
          </button>
        ))}
      </div>

      <div className="flex items-center gap-3">
        {period === 'custom' && (
          <div className="flex items-center gap-2 animate-in fade-in zoom-in-95 duration-300">
            <input
              type="date"
              value={startDate}
              onChange={(e) => onStartDateChange(e.target.value)}
              className="px-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm shadow-xs focus:ring-2 focus:ring-yellow-500/20 outline-hidden transition-all"
            />
            <span className="text-gray-400 font-bold">→</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => onEndDateChange(e.target.value)}
              className="px-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm shadow-xs focus:ring-2 focus:ring-yellow-500/20 outline-hidden transition-all"
            />
          </div>
        )}

        <Button
          onClick={onExport}
          variant="default"
          className="rounded-xl px-6 bg-yellow-600 hover:bg-yellow-700 dark:bg-yellow-600 dark:hover:bg-yellow-700 shadow-lg shadow-yellow-100 dark:shadow-yellow-900/20 transition-all active:scale-95 text-white"
        >
          <Download className="h-4 w-4 mr-2" />
          Exportar
        </Button>
      </div>
    </div>
  );
}
