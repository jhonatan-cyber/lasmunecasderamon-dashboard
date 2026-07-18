import { Skeleton as BoneyardSkeleton } from 'boneyard-js/react';
import { DevolucionesVentasPageClient } from '@/components/returns/sales/DevolucionesVentasPageClient';

export default function DevolucionesVentasPage() {
  return (
    <BoneyardSkeleton name="returns-sales-main" loading={false}>
      <DevolucionesVentasPageClient />
    </BoneyardSkeleton>
  );
}
