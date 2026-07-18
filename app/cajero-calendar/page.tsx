import { Skeleton as BoneyardSkeleton } from 'boneyard-js/react';
import { CajeroCalendarPageClient } from '@/components/cajero/CajeroCalendarPageClient';

export default function CajeroCalendarPage() {
  return (
    <BoneyardSkeleton name="cajero-calendar-main" loading={false}>
      <CajeroCalendarPageClient />
    </BoneyardSkeleton>
  );
}
