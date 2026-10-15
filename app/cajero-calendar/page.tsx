import { Skeleton as BoneyardSkeleton } from '@/components/shared/Skeleton';
import { RoleCalendarPageClient } from '@/components/shared/RoleCalendarPageClient';

export default function CajeroCalendarPage() {
  return (
    <BoneyardSkeleton name='cajero-calendar-main' loading={false}>
      <RoleCalendarPageClient role='cajero' backLink='/dashboard' />
    </BoneyardSkeleton>
  );
}
