import { Skeleton as BoneyardSkeleton } from 'boneyard-js/react';
import { RoleCalendarPageClient } from '@/components/shared/RoleCalendarPageClient';

export default function CajeroCalendarPage() {
  return (
    <BoneyardSkeleton name='cajero-calendar-main' loading={false}>
      <RoleCalendarPageClient role='cajero' backLink='/' />
    </BoneyardSkeleton>
  );
}
