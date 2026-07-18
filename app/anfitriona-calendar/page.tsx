import { Skeleton as BoneyardSkeleton } from 'boneyard-js/react';
import { AnfitrionaCalendarPageClient } from '@/components/anfitriona/AnfitrionaCalendarPageClient';

export default function AnfitrionaCalendarPage() {
  return (
    <BoneyardSkeleton name="anfitriona-calendar-main" loading={false}>
      <AnfitrionaCalendarPageClient />
    </BoneyardSkeleton>
  );
}
