import { Skeleton as BoneyardSkeleton } from '@/components/shared/Skeleton';
import NewPrivateRoomPageClient from '@/components/private-rooms/NewPrivateRoomPageClient';

export default function Page() {
  return (
    <BoneyardSkeleton name='private-rooms-new-main' loading={false}>
      <NewPrivateRoomPageClient />
    </BoneyardSkeleton>
  );
}
