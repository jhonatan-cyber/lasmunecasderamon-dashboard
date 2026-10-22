import { Skeleton as BoneyardSkeleton } from '@/components/shared/Skeleton';
import GarzonPedidosPageClient from '@/components/waiters/GarzonPedidosPageClient';

export default function Page() {
  return (
    <BoneyardSkeleton name='garzon-pedidos-main' loading={false}>
      <GarzonPedidosPageClient />
    </BoneyardSkeleton>
  );
}
