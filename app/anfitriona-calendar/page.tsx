import { Skeleton as BoneyardSkeleton } from 'boneyard-js/react';
import { RoleCalendarPageClient } from '@/components/shared/RoleCalendarPageClient';

export default function AnfitrionaCalendarPage() {
  return (
    <BoneyardSkeleton name='anfitriona-calendar-main' loading={false}>
      <RoleCalendarPageClient role='anfitriona' backLink='/anfitriona-dashboard' />
    </BoneyardSkeleton>
  );
}
