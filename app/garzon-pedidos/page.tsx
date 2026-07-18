import { Skeleton as BoneyardSkeleton } from 'boneyard-js/react';
import GarzonPedidosPageClient from '@/components/garzon/GarzonPedidosPageClient';

export default function Page() {
  return (
    <BoneyardSkeleton name="garzon-pedidos-main" loading={false}>
      <GarzonPedidosPageClient />
    </BoneyardSkeleton>
  );
}
