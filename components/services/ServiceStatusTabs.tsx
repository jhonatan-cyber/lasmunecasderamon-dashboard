import { ModuleStatusTabs } from '@/components/shared/ModuleStatusTabs';

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
    <ModuleStatusTabs
      ariaLabel='Filtrar servicios por estado'
      className='mb-6 justify-center'
      items={[
        {
          label: 'En Proceso',
          active: !showAllServices,
          onSelect: onShowActiveServices,
          tone: 'warning'
        },
        {
          label: 'Finalizados',
          active: showAllServices,
          onSelect: onShowAllServices,
          tone: 'success'
        }
      ]}
    />
  );
}
