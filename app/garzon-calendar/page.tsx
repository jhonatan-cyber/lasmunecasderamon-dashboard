import { Skeleton as BoneyardSkeleton } from 'boneyard-js/react';
import { RoleCalendarPageClient } from '@/components/shared/RoleCalendarPageClient';

export default function GarzonCalendarPage() {
  return (
    <BoneyardSkeleton name='garzon-calendar-main' loading={false}>
      <RoleCalendarPageClient role='garzon' backLink='/garzon-dashboard' />
    </BoneyardSkeleton>
  );
}
