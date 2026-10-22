import { Skeleton as BoneyardSkeleton } from '@/components/shared/Skeleton';
import { RoleCalendarPageClient } from '@/components/shared/RoleCalendarPageClient';

export default function GarzonCalendarPage() {
  return (
    <BoneyardSkeleton name='garzon-calendar-main' loading={false}>
      <RoleCalendarPageClient role='garzon' backLink='/waiter-dashboard' />
    </BoneyardSkeleton>
  );
}
