import { Skeleton as BoneyardSkeleton } from 'boneyard-js/react';
import AnfitrionaServiciosPageClient from '@/components/anfitriona/AnfitrionaServiciosPageClient';

export default function Page() {
  return (
    <BoneyardSkeleton name="anfitriona-servicios-main" loading={false}>
      <AnfitrionaServiciosPageClient />
    </BoneyardSkeleton>
  );
}
