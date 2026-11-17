'use client';

import { RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface SettingsLogsTabHeaderProps {
  refreshing: boolean;
  onRefresh: () => void;
}

export function SettingsLogsTabHeader({ refreshing, onRefresh }: SettingsLogsTabHeaderProps) {
  return (
    <div className='flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between'>
      <div>
        <h2 className='text-xl sm:text-2xl lg:text-3xl font-bold text-black dark:text-neutral-100'>
          Logs del Sistema
        </h2>
      </div>

      <Button onClick={onRefresh} disabled={refreshing} className='w-full rounded-full sm:w-auto'>
        <RefreshCw className={`mr-2 h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
        Refrescar logs
      </Button>
    </div>
  );
}
