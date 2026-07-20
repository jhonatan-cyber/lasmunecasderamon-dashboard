'use client';

interface ServiceStatusTabsProps {
  showAllServices: boolean;
  onShowActiveServices: () => void;
  onShowAllServices: () => void;
}

export function ServiceStatusTabs({
  showAllServices,
  onShowActiveServices,
  onShowAllServices
}: ServiceStatusTabsProps) {
  return (
    <div className='flex justify-center gap-3 border-b pb-1 mb-6'>
      <button
        onClick={onShowActiveServices}
        className={`flex items-center gap-2 px-5 py-2 text-sm font-semibold transition-all ${
          !showAllServices
            ? 'bg-amber-100 text-amber-700 rounded-full shadow-xs'
            : 'text-gray-500 hover:bg-gray-100 rounded-full'
        }`}
      >
        En Proceso
      </button>
      <button
        onClick={onShowAllServices}
        className={`flex items-center gap-2 px-5 py-2 text-sm font-semibold transition-all ${
          showAllServices
            ? 'bg-green-100 text-green-700 rounded-full shadow-xs'
            : 'text-gray-500 hover:bg-gray-100 rounded-full'
        }`}
      >
        Finalizados
      </button>
    </div>
  );
}
