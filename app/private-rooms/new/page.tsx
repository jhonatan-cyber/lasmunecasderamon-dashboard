import { Skeleton as BoneyardSkeleton } from 'boneyard-js/react';
import NewPrivateRoomPageClient from '@/components/private-rooms/NewPrivateRoomPageClient';

export default function Page() {
  return (
    <BoneyardSkeleton name="private-rooms-new-main" loading={false}>
      <NewPrivateRoomPageClient />
    </BoneyardSkeleton>
  );
}
