import { Skeleton as BoneyardSkeleton } from '@/components/shared/Skeleton';
import { RoleCalendarPageClient } from '@/components/shared/RoleCalendarPageClient';

export default function AnfitrionaCalendarPage() {
  return (
    <BoneyardSkeleton name='anfitriona-calendar-main' loading={false}>
      <RoleCalendarPageClient role='anfitriona' backLink='/hostess-dashboard' />
    </BoneyardSkeleton>
  );
}
