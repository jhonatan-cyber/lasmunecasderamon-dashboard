import { Skeleton as BoneyardSkeleton } from 'boneyard-js/react';
import { GarzonCalendarPageClient } from '@/components/garzon/GarzonCalendarPageClient';

export default function GarzonCalendarPage() {
  return (
    <BoneyardSkeleton name="garzon-calendar-main" loading={false}>
      <GarzonCalendarPageClient />
    </BoneyardSkeleton>
  );
}
